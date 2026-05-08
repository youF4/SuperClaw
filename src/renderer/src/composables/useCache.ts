/**
 * 缓存管理组合式函数
 * 
 * 声明式地管理本地缓存
 */

import { computed, type Ref, type ComputedRef } from 'vue'

/**
 * 缓存项配置
 */
export interface CacheItem<T> {
  /** 缓存键 */
  key: string | ComputedRef<string>
  /** 获取数据 */
  get: () => Promise<T>
  /** 设置数据 */
  set: (data: T) => Promise<void>
  /** 删除数据 */
  del?: () => Promise<void>
}

/**
 * 缓存策略
 */
export interface CacheStrategy {
  /** 缓存时间（毫秒） */
  ttl?: number
  /** 最大条目数 */
  maxEntries?: number
  /** 是否启用 */
  enabled?: boolean
}

/**
 * 声明式缓存管理
 * 
 * @example
 * ```ts
 * const messagesCache = useCache<Message[]>({
 *   key: computed(() => `messages-${sessionId}`),
 *   strategy: { ttl: 5 * 60 * 1000 }
 * })
 * 
 * // 获取
 * const cached = await messagesCache.get()
 * 
 * // 设置
 * await messagesCache.set(messages)
 * ```
 */
export function useCache<T>(config: {
  key: string | ComputedRef<string>
  strategy?: CacheStrategy
}) {
  const { key, strategy = {} } = config
  const { ttl = 0, maxEntries = 100, enabled = true } = strategy

  /**
   * 解析缓存键
   */
  const cacheKey = computed(() => {
    return typeof key === 'string' ? key : key.value
  })

  /**
   * 获取缓存
   */
  const get = async (): Promise<T | null> => {
    if (!enabled) return null

    const k = cacheKey.value
    const data = await window.electronAPI.cache.getMessages(k)
    
    if (!data || data.length === 0) return null

    // 检查 TTL
    if (ttl > 0) {
      const lastSync = await window.electronAPI.cache.getLastSync(k)
      if (Date.now() - lastSync > ttl) {
        return null
      }
    }

    return data as T
  }

  /**
   * 设置缓存
   */
  const set = async (data: T): Promise<void> => {
    if (!enabled) return

    const k = cacheKey.value
    await window.electronAPI.cache.saveMessages(k, data as any[])
    await window.electronAPI.cache.updateLastSync(k)
  }

  /**
   * 删除缓存
   */
  const del = async (): Promise<void> => {
    const k = cacheKey.value
    await window.electronAPI.cache.deleteSession(k)
  }

  /**
   * 检查缓存是否存在
   */
  const has = async (): Promise<boolean> => {
    const data = await get()
    return data !== null
  }

  /**
   * 获取缓存年龄（毫秒）
   */
  const age = async (): Promise<number> => {
    const k = cacheKey.value
    const lastSync = await window.electronAPI.cache.getLastSync(k)
    return Date.now() - lastSync
  }

  /**
   * 缓存是否过期
   */
  const isExpired = async (): Promise<boolean> => {
    if (ttl === 0) return false
    const a = await age()
    return a > ttl
  }

  return {
    cacheKey,
    get,
    set,
    del,
    has,
    age,
    isExpired
  }
}

/**
 * 多缓存管理器
 * 
 * @example
 * ```ts
 * const cacheManager = useCacheManager({
 *   messages: { key: 'messages', ttl: 5 * 60 * 1000 },
 *   sessions: { key: 'sessions', ttl: 10 * 60 * 1000 }
 * })
 * ```
 */
export function useCacheManager<T extends Record<string, any>>(configs: {
  [K in keyof T]: {
    key: string | ComputedRef<string>
    ttl?: number
  }
}) {
  const caches = {} as {
    [K in keyof T]: ReturnType<typeof useCache<T[K]>>
  }

  // 声明式创建缓存实例
  for (const name in configs) {
    const config = configs[name]
    caches[name] = useCache<T[typeof name]>({
      key: config.key,
      strategy: { ttl: config.ttl }
    })
  }

  /**
   * 清空所有缓存
   */
  const clearAll = async () => {
    await window.electronAPI.cache.clear()
  }

  /**
   * 获取缓存总大小
   */
  const getSize = async () => {
    return await window.electronAPI.cache.getSize()
  }

  /**
   * 清理旧缓存
   */
  const cleanOld = async (keepCount: number = 10) => {
    await window.electronAPI.cache.cleanOld(keepCount)
  }

  return {
    caches,
    clearAll,
    getSize,
    cleanOld
  }
}
