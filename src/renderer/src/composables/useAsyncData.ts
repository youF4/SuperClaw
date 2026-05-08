/**
 * 异步数据管理组合式函数
 * 
 * 声明式地管理异步数据获取、缓存和状态
 */

import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'

/**
 * 异步数据状态
 */
export interface AsyncData<T> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  mutate: (data: T) => void
  refresh: () => Promise<void>
}

/**
 * 异步数据配置
 */
export interface AsyncDataOptions<T> {
  /** 初始值 */
  initialData?: T
  /** 缓存键（用于标识） */
  key?: string | ComputedRef<string>
  /** 是否立即执行 */
  immediate?: boolean
  /** 缓存时间（毫秒，0 表示不缓存） */
  cacheTime?: number
  /** 数据转换函数 */
  transform?: (data: any) => T
  /** 错误处理 */
  onError?: (error: Error) => void
  /** 成功处理 */
  onSuccess?: (data: T) => void
}

/**
 * 声明式异步数据管理
 * 
 * @example
 * ```ts
 * const { data, loading, error } = useAsyncData(
 *   () => api.getMessages(sessionKey.value),
 *   { key: computed(() => `messages-${sessionKey.value}`) }
 * )
 * ```
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  options: AsyncDataOptions<T> = {}
): AsyncData<T> {
  const {
    initialData = null,
    key,
    immediate = true,
    cacheTime = 0,
    transform,
    onError,
    onSuccess
  } = options

  // 声明式状态
  const data = ref<T | null>(initialData) as Ref<T | null>
  const loading = ref(false)
  const error = ref<Error | null>(null)

  // 缓存映射
  const cacheMap = new Map<string, { data: T; timestamp: number }>()

  /**
   * 获取缓存键
   */
  const cacheKey = computed(() => {
    if (!key) return null
    return typeof key === 'string' ? key : key.value
  })

  /**
   * 检查缓存是否有效
   */
  const isCacheValid = (key: string): boolean => {
    if (cacheTime === 0) return false
    const cached = cacheMap.get(key)
    if (!cached) return false
    return Date.now() - cached.timestamp < cacheTime
  }

  /**
   * 获取数据
   */
  const fetchData = async () => {
    const key = cacheKey.value

    // 检查缓存
    if (key && isCacheValid(key)) {
      const cached = cacheMap.get(key)!
      data.value = transform ? transform(cached.data) : cached.data
      return
    }

    loading.value = true
    error.value = null

    try {
      let result = await fetcher()
      
      // 应用转换
      if (transform) {
        result = transform(result)
      }

      data.value = result

      // 更新缓存
      if (key && cacheTime > 0) {
        cacheMap.set(key, { data: result, timestamp: Date.now() })
      }

      onSuccess?.(result)
    } catch (e) {
      error.value = e as Error
      onError?.(error.value)
    } finally {
      loading.value = false
    }
  }

  /**
   * 手动更新数据
   */
  const mutate = (newData: T) => {
    data.value = newData
    const key = cacheKey.value
    if (key && cacheTime > 0) {
      cacheMap.set(key, { data: newData, timestamp: Date.now() })
    }
  }

  /**
   * 刷新数据
   */
  const refresh = async () => {
    // 清除缓存
    const key = cacheKey.value
    if (key) {
      cacheMap.delete(key)
    }
    await fetchData()
  }

  // 监听缓存键变化，自动刷新
  if (key && typeof key !== 'string') {
    watch(cacheKey, () => {
      if (immediate) {
        fetchData()
      }
    })
  }

  // 立即执行
  if (immediate) {
    fetchData()
  }

  return {
    data,
    loading,
    error,
    mutate,
    refresh
  }
}

/**
 * 异步操作管理（用于 mutation）
 */
export interface AsyncMutation<T, P> {
  mutate: (payload: P) => Promise<T>
  loading: Ref<boolean>
  error: Ref<Error | null>
  data: Ref<T | null>
}

/**
 * 声明式异步操作管理
 * 
 * @example
 * ```ts
 * const { mutate: sendMessage, loading } = useAsyncMutation(
 *   (text: string) => api.sendMessage(sessionKey, text)
 * )
 * ```
 */
export function useAsyncMutation<T, P>(
  mutator: (payload: P) => Promise<T>,
  options: {
    onSuccess?: (data: T, payload: P) => void
    onError?: (error: Error, payload: P) => void
  } = {}
): AsyncMutation<T, P> {
  const { onSuccess, onError } = options

  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref<Error | null>(null)

  const mutate = async (payload: P) => {
    loading.value = true
    error.value = null

    try {
      const result = await mutator(payload)
      data.value = result
      onSuccess?.(result, payload)
      return result
    } catch (e) {
      error.value = e as Error
      onError?.(error.value, payload)
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    mutate,
    loading,
    error,
    data
  }
}

/**
 * 轮询数据
 */
export interface AsyncPolling<T> extends AsyncData<T> {
  start: (interval: number) => void
  stop: () => void
}

/**
 * 声明式轮询
 * 
 * @example
 * ```ts
 * const { data, start, stop } = usePolling(
 *   () => api.getStatus(),
 *   { interval: 5000 }
 * )
 * ```
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  options: AsyncDataOptions<T> & { interval?: number } = {}
): AsyncPolling<T> {
  const { interval = 5000, ...asyncOptions } = options
  const asyncData = useAsyncData(fetcher, asyncOptions)

  let timer: NodeJS.Timeout | null = null

  const start = (ms: number = interval) => {
    stop()
    timer = setInterval(() => {
      asyncData.refresh()
    }, ms)
  }

  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  return {
    ...asyncData,
    start,
    stop
  }
}
