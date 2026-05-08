/**
 * Chat Store（声明式重构）
 * 
 * 使用组合式函数，减少命令式代码
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useChatHistory } from '@/composables/useChatHistory'
import { useCache } from '@/composables/useCache'
import gatewayApi from '@/lib/gateway'
import { notify } from '@/composables/useNotification'
import type { MessageAttachment } from '@/lib/types'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: number
  attachments?: MessageAttachment[]
}

/**
 * Chat Store
 * 
 * 声明式设计：
 * - 状态：ref/computed
 * - 操作：组合式函数
 * - 副作用：watch
 */
export const useChatStore = defineStore('chat', () => {
  // ==================== 状态 ====================
  
  /** 当前会话键 */
  const currentSessionKey = ref<string | null>(null)
  
  /** 消息列表 */
  const messages = ref<Message[]>([])
  
  /** 加载状态 */
  const loading = ref(false)
  
  /** 流式输出状态 */
  const streaming = ref(false)
  
  /** 错误信息 */
  const error = ref<Error | null>(null)

  // ==================== 计算属性 ====================
  
  /** 是否有消息 */
  const hasMessages = computed(() => messages.value.length > 0)
  
  /** 最后一条消息 */
  const lastMessage = computed(() => messages.value[messages.value.length - 1])
  
  /** 用户消息数量 */
  const userMessageCount = computed(() =>
    messages.value.filter(m => m.role === 'user').length
  )

  // ==================== 缓存 ====================
  
  const cache = useCache<Message[]>({
    key: computed(() => `messages-${currentSessionKey.value}`),
    strategy: { ttl: 5 * 60 * 1000 }
  })

  // ==================== 操作 ====================

  /**
   * 获取消息历史（声明式）
   */
  async function fetchHistory(sessionKey: string, limit = 50) {
    currentSessionKey.value = sessionKey
    loading.value = true
    error.value = null

    try {
      // 优先缓存
      const cached = await cache.get()
      if (cached && !await cache.isExpired()) {
        messages.value = cached
        loading.value = false
        // 后台更新
        updateInBackground(sessionKey)
        return
      }

      // 从服务器获取
      const response = await gatewayApi.chat.history(sessionKey, limit)
      if (response.ok && response.result) {
        messages.value = response.result as Message[]
        await cache.set(messages.value)
      } else {
        error.value = new Error(response.error || '获取失败')
        notify(`获取消息历史失败: ${response.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      error.value = e as Error
      notify(`获取消息历史出错: ${e}`, 'error')
    }

    loading.value = false
  }

  /**
   * 后台更新（声明式）
   */
  async function updateInBackground(sessionKey: string) {
    // 检查是否需要更新
    const age = await cache.age()
    if (age < 5 * 60 * 1000) return // 5 分钟内不更新

    try {
      const response = await gatewayApi.chat.history(sessionKey, 100)
      if (response.ok && response.result) {
        const serverMessages = response.result as Message[]
        
        // 增量更新
        if (serverMessages.length > messages.value.length) {
          const newMessages = serverMessages.slice(messages.value.length)
          messages.value.push(...newMessages)
          await cache.set(messages.value)
        }
      }
    } catch (e) {
      // 静默失败
      console.error('后台更新失败:', e)
    }
  }

  /**
   * 发送消息（声明式）
   */
  async function sendMessage(sessionKey: string, text: string) {
    if (!text.trim() || streaming.value) return

    // 添加用户消息
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: Date.now()
    }
    
    // 乐观更新
    messages.value.push(userMessage)
    await cache.set(messages.value)

    // 发送到服务器
    streaming.value = true
    try {
      const response = await gatewayApi.chat.send(sessionKey, text)
      if (response.ok && response.result) {
        const assistantMessage = normalizeMessage(response.result)
        messages.value.push(assistantMessage)
        await cache.set(messages.value)
      } else {
        // 回滚
        messages.value.pop()
        notify(`发送消息失败: ${response.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      messages.value.pop()
      notify(`发送消息出错: ${e}`, 'error')
    }
    streaming.value = false
  }

  /**
   * 标准化消息（声明式）
   */
  function normalizeMessage(raw: unknown): Message {
    // 类型守卫
    if (typeof raw === 'string') {
      return {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: raw,
        createdAt: Date.now()
      }
    }

    // 对象形式
    const obj = raw as Record<string, unknown>
    return {
      id: (obj.id as string) || `assistant-${Date.now()}`,
      role: (obj.role as Message['role']) || 'assistant',
      content: (obj.content as string) || JSON.stringify(obj),
      createdAt: (obj.createdAt as number) || Date.now(),
      attachments: obj.attachments as Message['attachments']
    }
  }

  /**
   * 添加实时消息（WebSocket）
   */
  async function addRealtimeMessage(msg: unknown) {
    const message = normalizeMessage(msg)
    
    // 去重
    if (messages.value.some(m => m.id === message.id)) return
    
    messages.value.push(message)
    
    if (currentSessionKey.value) {
      await cache.set(messages.value)
    }
  }

  /**
   * 终止生成
   */
  async function abort(sessionKey: string) {
    try {
      await gatewayApi.chat.abort(sessionKey)
    } catch (e) {
      notify(`终止消息失败: ${e}`, 'error')
    }
    streaming.value = false
  }

  /**
   * 清空消息
   */
  function clear() {
    messages.value = []
    error.value = null
  }

  // ==================== 导出 ====================
  
  return {
    // 状态
    messages,
    loading,
    streaming,
    error,
    currentSessionKey,
    
    // 计算属性
    hasMessages,
    lastMessage,
    userMessageCount,
    
    // 操作
    fetchHistory,
    sendMessage,
    addRealtimeMessage,
    abort,
    clear
  }
})
