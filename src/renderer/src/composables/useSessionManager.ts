/**
 * 会话管理组合式函数
 * 
 * 声明式地管理会话列表和当前会话
 */

import { computed, type Ref, type ComputedRef } from 'vue'
import { useAsyncData, useAsyncMutation } from './useAsyncData'
import gatewayApi from '@/lib/gateway'

/**
 * 会话数据
 */
export interface Session {
  key: string
  agentId?: string
  createdAt: number
  lastMessageAt?: number
  messageCount?: number
  title?: string
}

/**
 * 会话管理配置
 */
export interface SessionConfig {
  /** 当前会话键（双向绑定） */
  currentKey?: Ref<string | null>
  /** 是否自动选择第一个会话 */
  autoSelectFirst?: boolean
  /** 是否缓存当前会话 */
  cacheCurrent?: boolean
}

/**
 * 会话管理返回值
 */
export interface SessionManager {
  /** 会话列表 */
  sessions: Ref<Session[]>
  /** 当前会话键 */
  currentKey: Ref<string | null>
  /** 当前会话 */
  currentSession: ComputedRef<Session | undefined>
  /** 加载状态 */
  loading: Ref<boolean>
  /** 创建会话 */
  createSession: (agentId?: string) => Promise<Session | null>
  /** 删除会话 */
  deleteSession: (key: string) => Promise<void>
  /** 选择会话 */
  selectSession: (key: string) => void
  /** 刷新列表 */
  refresh: () => Promise<void>
  /** 按时间排序的会话列表 */
  sortedSessions: ComputedRef<Session[]>
}

/**
 * 声明式会话管理
 * 
 * @example
 * ```vue
 * <script setup>
 * const currentKey = ref(null)
 * const { sessions, currentKey, selectSession } = useSessionManager({
 *   currentKey,
 *   autoSelectFirst: true
 * })
 * </script>
 * 
 * <template>
 *   <div
 *     v-for="session in sessions"
 *     :key="session.key"
 *     :class="{ active: session.key === currentKey }"
 *     @click="selectSession(session.key)"
 *   >
 *     {{ session.title || session.key }}
 *   </div>
 * </template>
 * ```
 */
export function useSessionManager(config: SessionConfig = {}): SessionManager {
  const {
    currentKey,
    autoSelectFirst = true,
    cacheCurrent = true
  } = config

  // 声明式数据管理
  const { data, loading, refresh } = useAsyncData<Session[]>(
    async () => {
      const response = await gatewayApi.sessions.list()
      return response.ok && response.result ? response.result as Session[] : []
    },
    {
      key: 'sessions',
      immediate: true,
      onSuccess: async (sessions) => {
        // 保存到缓存
        for (const session of sessions) {
          await window.electronAPI.cache.saveSession(session)
        }

        // 自动选择第一个会话
        if (autoSelectFirst && sessions.length > 0 && !currentKey?.value) {
          const cachedKey = await window.electronAPI.cache.getCurrentSession()
          const key = cachedKey || sessions[0].key
          currentKey && (currentKey.value = key)
        }
      }
    }
  )

  // 当前会话键
  const sessionKey = currentKey || ref<string | null>(null)

  // 当前会话
  const currentSession = computed(() =>
    data.value?.find(s => s.key === sessionKey.value)
  )

  // 按时间排序的会话列表
  const sortedSessions = computed(() =>
    (data.value || []).sort((a, b) =>
      (b.lastMessageAt || b.createdAt) - (a.lastMessageAt || a.createdAt)
    )
  )

  /**
   * 创建会话
   */
  const { mutate: createSession } = useAsyncMutation(
    async (agentId?: string) => {
      const response = await gatewayApi.sessions.create(agentId)
      if (response.ok && response.result) {
        const session = response.result as Session
        
        // 更新列表
        const current = data.value || []
        mutate([...current, session])
        
        // 保存到缓存
        await window.electronAPI.cache.saveSession(session)
        
        // 选中新会话
        sessionKey.value = session.key
        if (cacheCurrent) {
          await window.electronAPI.cache.setCurrentSession(session.key)
        }
        
        return session
      }
      return null
    }
  )

  /**
   * 删除会话
   */
  const { mutate: deleteSession } = useAsyncMutation(
    async (key: string) => {
      const response = await gatewayApi.sessions.delete(key)
      if (response.ok) {
        // 更新列表
        const current = data.value || []
        mutate(current.filter(s => s.key !== key))
        
        // 删除缓存
        await window.electronAPI.cache.deleteSession(key)
        
        // 如果删除的是当前会话，切换到第一个
        if (sessionKey.value === key) {
          const first = current.find(s => s.key !== key)
          sessionKey.value = first?.key || null
          if (cacheCurrent) {
            await window.electronAPI.cache.setCurrentSession(sessionKey.value)
          }
        }
      }
    }
  )

  /**
   * 选择会话
   */
  const selectSession = async (key: string) => {
    sessionKey.value = key
    if (cacheCurrent) {
      await window.electronAPI.cache.setCurrentSession(key)
    }
  }

  return {
    sessions: data as Ref<Session[]>,
    currentKey: sessionKey,
    currentSession,
    loading,
    createSession,
    deleteSession,
    selectSession,
    refresh,
    sortedSessions
  }
}

/**
 * 引入 ref（避免循环依赖）
 */
import { ref } from 'vue'
