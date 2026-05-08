/**
 * 聊天历史管理组合式函数
 * 
 * 声明式地管理聊天消息历史
 */

import { computed, watch, type Ref, type ComputedRef } from 'vue'
import { useAsyncData, useAsyncMutation } from './useAsyncData'
import { useCache } from './useCache'
import gatewayApi from '@/lib/gateway'
import type { Message } from '@/stores/chat'

/**
 * 聊天历史配置
 */
export interface ChatHistoryConfig {
  /** 会话键 */
  sessionKey: Ref<string> | ComputedRef<string>
  /** 消息限制 */
  limit?: number
  /** 缓存时间（毫秒） */
  cacheTime?: number
  /** 是否自动刷新 */
  autoRefresh?: boolean
  /** 刷新间隔（毫秒） */
  refreshInterval?: number
}

/**
 * 聊天历史返回值
 */
export interface ChatHistory {
  /** 消息列表 */
  messages: Ref<Message[]>
  /** 加载状态 */
  loading: Ref<boolean>
  /** 错误信息 */
  error: Ref<Error | null>
  /** 发送消息 */
  sendMessage: (text: string) => Promise<void>
  /** 刷新历史 */
  refresh: () => Promise<void>
  /** 是否有更多消息 */
  hasMore: ComputedRef<boolean>
  /** 加载更多 */
  loadMore: () => Promise<void>
}

/**
 * 声明式聊天历史管理
 * 
 * @example
 * ```vue
 * <script setup>
 * const sessionKey = ref('session-123')
 * const { messages, loading, sendMessage } = useChatHistory({
 *   sessionKey,
 *   cacheTime: 5 * 60 * 1000
 * })
 * </script>
 * 
 * <template>
 *   <div v-for="msg in messages" :key="msg.id">
 *     {{ msg.content }}
 *   </div>
 *   <button @click="sendMessage('Hello')">发送</button>
 * </template>
 * ```
 */
export function useChatHistory(config: ChatHistoryConfig): ChatHistory {
  const {
    sessionKey,
    limit = 50,
    cacheTime = 5 * 60 * 1000,
    autoRefresh = false,
    refreshInterval = 30 * 1000
  } = config

  // 声明式缓存
  const cache = useCache<Message[]>({
    key: computed(() => `messages-${sessionKey.value}`),
    strategy: { ttl: cacheTime }
  })

  /**
   * 获取消息历史
   */
  const fetchMessages = async (): Promise<Message[]> => {
    // 优先使用缓存
    const cached = await cache.get()
    if (cached && !await cache.isExpired()) {
      return cached
    }

    // 从服务器获取
    const response = await gatewayApi.chat.history(sessionKey.value, limit)
    if (response.ok && response.result) {
      const messages = response.result as Message[]
      await cache.set(messages)
      return messages
    }

    return cached || []
  }

  // 声明式数据管理
  const { data, loading, error, mutate, refresh } = useAsyncData(
    fetchMessages,
    {
      key: computed(() => `chat-${sessionKey.value}`),
      immediate: true
    }
  )

  /**
   * 发送消息
   */
  const { mutate: sendMessage } = useAsyncMutation(
    async (text: string) => {
      const response = await gatewayApi.chat.send(sessionKey.value, text)
      if (response.ok && response.result) {
        const message = response.result as Message
        
        // 更新本地数据
        const currentMessages = data.value || []
        mutate([...currentMessages, message])
        
        // 更新缓存
        await cache.set([...currentMessages, message])
        
        return message
      }
      throw new Error(response.error || '发送失败')
    },
    {
      onError: (err) => {
        console.error('发送消息失败:', err)
      }
    }
  )

  /**
   * 是否有更多消息
   */
  const hasMore = computed(() => {
    return (data.value?.length || 0) >= limit
  })

  /**
   * 加载更多消息
   */
  const loadMore = async () => {
    if (!hasMore.value) return

    const response = await gatewayApi.chat.history(
      sessionKey.value,
      limit * 2 // 加载更多
    )
    
    if (response.ok && response.result) {
      mutate(response.result as Message[])
    }
  }

  // 自动刷新
  if (autoRefresh) {
    let timer: NodeJS.Timeout | null = null
    
    watch(sessionKey, () => {
      if (timer) clearInterval(timer)
      timer = setInterval(() => refresh(), refreshInterval)
    }, { immediate: true })
  }

  // 监听会话变化，自动刷新
  watch(sessionKey, () => {
    refresh()
  })

  return {
    messages: data as Ref<Message[]>,
    loading,
    error,
    sendMessage,
    refresh,
    hasMore,
    loadMore
  }
}
