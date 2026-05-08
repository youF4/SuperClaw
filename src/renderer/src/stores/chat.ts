import { defineStore } from 'pinia'
import { ref } from 'vue'
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

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([])
  const loading = ref(false)
  const streaming = ref(false)

  async function fetchHistory(sessionKey: string, limit = 50) {
    loading.value = true
    try {
      const response = await gatewayApi.chat.history(sessionKey, limit)
      if (response.ok && response.result) {
        messages.value = response.result as Message[]
      } else {
        notify(`获取消息历史失败: ${response.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      notify(`获取消息历史出错: ${e}`, 'error')
    }
    loading.value = false
  }

  /** 标准化消息对象：兼容 API 返回纯文本或 Message 对象两种格式 */
  function normalizeMessage(raw: unknown): Message {
    if (typeof raw === 'string') {
      return {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: raw,
        createdAt: Date.now(),
      }
    }
    const obj = raw as Record<string, unknown>
    return {
      id: (obj.id as string) || `assistant-${Date.now()}`,
      role: (obj.role as Message['role']) || 'assistant',
      content: (obj.content as string) || JSON.stringify(obj),
      createdAt: (obj.createdAt as number) || Date.now(),
      attachments: obj.attachments as Message['attachments'] | undefined,
    }
  }

  async function sendMessage(sessionKey: string, text: string) {
    // 添加用户消息
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: Date.now(),
    }
    messages.value.push(userMessage)

    // 发送到 Gateway
    streaming.value = true
    try {
      const response = await gatewayApi.chat.send(sessionKey, text)
      if (response.ok && response.result) {
        const assistantMessage = normalizeMessage(response.result)
        messages.value.push(assistantMessage)
      } else {
        notify(`发送消息失败: ${response.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      notify(`发送消息出错: ${e}`, 'error')
    }
    streaming.value = false
  }

  async function abort(sessionKey: string) {
    try {
      await gatewayApi.chat.abort(sessionKey)
    } catch (e) {
      notify(`终止消息失败: ${e}`, 'error')
    }
    streaming.value = false
  }

  function addRealtimeMessage(msg: unknown) {
    // 去重：避免 WebSocket 和 HTTP 响应同时添加同一条消息
    const msgObj = msg as Record<string, unknown>
    if (msgObj?.id && messages.value.some((m) => m.id === msgObj.id)) return
    messages.value.push(normalizeMessage(msg))
  }

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
    clear,
  }
})
