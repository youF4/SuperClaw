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
        // 添加助手回复
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.result as string,
          createdAt: Date.now(),
        }
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

  function clear() {
    messages.value = []
  }

  return {
    messages,
    loading,
    streaming,
    fetchHistory,
    sendMessage,
    abort,
    clear,
  }
})
