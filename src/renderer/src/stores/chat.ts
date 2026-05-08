/**
 * Chat Store
 * 
 * 管理消息历史，支持本地缓存
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import gatewayApi from '@/lib/gateway'
import { cache } from '@/lib/storage'
import { notify } from '@/composables/useNotification'
import type { MessageAttachment } from '@/lib/types'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: number
  attachments?: MessageAttachment[]
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([])
  const loading = ref(false)
  const streaming = ref(false)

  /**
   * 获取消息历史（优先使用缓存）
   */
  async function fetchHistory(sessionKey: string, limit = 50) {
    loading.value = true

    try {
      // 1. 先读取本地缓存
      const cached = await cache.getMessages(sessionKey)
      if (cached.length > 0) {
        messages.value = cached as Message[]
        loading.value = false

        // 2. 后台静默更新
        updateInBackground(sessionKey)
        return
      }

      // 3. 无缓存，直接请求服务器
      const response = await gatewayApi.chat.history(sessionKey, limit)
      if (response.ok && response.result) {
        messages.value = response.result as Message[]

        // 4. 保存到缓存
        await cache.saveMessages(sessionKey, messages.value as any)
        await cache.updateLastSync(sessionKey)
      } else {
        notify(`获取消息历史失败: ${response.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      notify(`获取消息历史出错: ${e}`, 'error')
    }

    loading.value = false
  }

  /**
   * 后台静默更新
   */
  async function updateInBackground(sessionKey: string) {
    const lastMessage = messages.value[messages.value.length - 1]
    if (!lastMessage) return

    const lastSyncAt = await cache.getLastSync(sessionKey)
    const now = Date.now()

    // 如果 5 分钟内已同步过，跳过
    if (now - lastSyncAt < 5 * 60 * 1000) {
      return
    }

    try {
      // 请求最新消息
      const response = await gatewayApi.chat.history(sessionKey, 100)
      if (response.ok && response.result) {
        const serverMessages = response.result as Message[]
        
        // 检查是否有新消息
        if (serverMessages.length > messages.value.length) {
          // 合并新消息
          const newMessages = serverMessages.slice(messages.value.length)
          messages.value.push(...newMessages)
          
          // 更新缓存
          await cache.saveMessages(sessionKey, messages.value as any)
        }
        
        await cache.updateLastSync(sessionKey)
      }
    } catch (e) {
      // 静默失败，不影响用户体验
      console.error('后台更新失败:', e)
    }
  }

  /**
   * 标准化消息对象
   */
  function normalizeMessage(raw: unknown): Message {
    if (typeof raw === 'string') {
      return {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: raw,
        createdAt: Date.now()
      }
    }
    const obj = raw as Record<string, unknown>
    return {
      id: (obj.id as string) || `assistant-${Date.now()}`,
      role: (obj.role as Message['role']) || 'assistant',
      content: (obj.content as string) || JSON.stringify(obj),
      createdAt: (obj.createdAt as number) || Date.now(),
      attachments: obj.attachments as Message['attachments'] | undefined
    }
  }

  /**
   * 发送消息
   */
  async function sendMessage(sessionKey: string, text: string) {
    // 添加用户消息
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: Date.now()
    }
    messages.value.push(userMessage)

    // 立即保存到缓存
    await cache.appendMessage(sessionKey, userMessage as any)

    // 发送到 Gateway
    streaming.value = true
    try {
      const response = await gatewayApi.chat.send(sessionKey, text)
      if (response.ok && response.result) {
        const assistantMessage = normalizeMessage(response.result)
        messages.value.push(assistantMessage)

        // 保存到缓存
        await cache.appendMessage(sessionKey, assistantMessage as any)
      } else {
        notify(`发送消息失败: ${response.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      notify(`发送消息出错: ${e}`, 'error')
    }
    streaming.value = false
  }

  /**
   * 终止消息
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
   * 添加实时消息（WebSocket）
   */
  async function addRealtimeMessage(msg: unknown) {
    const msgObj = msg as Record<string, unknown>
    
    // 去重
    if (msgObj?.id && messages.value.some((m) => m.id === msgObj.id)) {
      return
    }

    const message = normalizeMessage(msg)
    messages.value.push(message)

    // 保存到缓存
    const sessionKey = await cache.getCurrentSession()
    if (sessionKey) {
      await cache.appendMessage(sessionKey, message as any)
    }
  }

  /**
   * 清空消息
   */
  function clear() {
    messages.value = []
  }

  return {
    messages,
    loading,
    streaming,
    fetchHistory,
    sendMessage,
    addRealtimeMessage,
    abort,
    clear
  }
})
