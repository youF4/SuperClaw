import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import gatewayApi from '@/lib/gateway'
import { notify } from '@/composables/useNotification'

export interface Session {
  key: string
  agentId?: string
  createdAt: number
  lastMessageAt?: number
}

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<Session[]>([])
  const currentSessionKey = ref<string | null>(null)
  const loading = ref(false)

  const currentSession = computed(() =>
    sessions.value.find((s) => s.key === currentSessionKey.value)
  )

  async function fetchSessions() {
    loading.value = true
    try {
      const response = await gatewayApi.sessions.list()
      if (response.ok && response.result) {
        sessions.value = response.result as Session[]
      } else {
        notify(`获取会话列表失败: ${response.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      notify(`获取会话列表出错: ${e}`, 'error')
    }
    loading.value = false
  }

  async function createSession(agentId?: string) {
    try {
      const response = await gatewayApi.sessions.create(agentId)
      if (response.ok && response.result) {
        const newSession = response.result as Session
        sessions.value.push(newSession)
        currentSessionKey.value = newSession.key
        return newSession
      }
      notify(`创建会话失败: ${response.error || '未知错误'}`, 'error')
    } catch (e) {
      notify(`创建会话出错: ${e}`, 'error')
    }
    return null
  }

  async function deleteSession(sessionKey: string) {
    try {
      const response = await gatewayApi.sessions.delete(sessionKey)
      if (response.ok) {
        sessions.value = sessions.value.filter((s) => s.key !== sessionKey)
        if (currentSessionKey.value === sessionKey) {
          currentSessionKey.value = sessions.value[0]?.key || null
        }
      } else {
        notify(`删除会话失败: ${response.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      notify(`删除会话出错: ${e}`, 'error')
    }
  }

  async function resetSession(sessionKey: string) {
    try {
      const response = await gatewayApi.sessions.reset(sessionKey)
      if (!response.ok) {
        notify(`重置会话失败: ${response.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      notify(`重置会话出错: ${e}`, 'error')
    }
  }

  async function compactSession(sessionKey: string) {
    try {
      const response = await gatewayApi.sessions.compact(sessionKey)
      if (!response.ok) {
        notify(`压缩会话失败: ${response.error || '未知错误'}`, 'error')
      }
    } catch (e) {
      notify(`压缩会话出错: ${e}`, 'error')
    }
  }

  function selectSession(sessionKey: string) {
    currentSessionKey.value = sessionKey
  }

  return {
    sessions,
    currentSessionKey,
    currentSession,
    loading,
    fetchSessions,
    createSession,
    deleteSession,
    resetSession,
    compactSession,
    selectSession,
  }
})
