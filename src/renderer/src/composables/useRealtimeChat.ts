/**
 * 基于 WebSocket 的实时聊天 composable
 *
 * 当 WebSocket 连接后，自动订阅当前会话的消息事件，
 * 实现消息的实时推送，替代轮询拉取。
 */
import { watch } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useSessionStore } from '@/stores/session'
import { useGatewayStore } from '@/stores/gateway'
import gatewayWs, { type GatewayEvent } from '@/lib/websocket'

/**
 * 在 Chat 页面中启用实时消息推送
 *
 * - WebSocket 连接后自动订阅当前会话
 * - 收到 session.message 事件时更新 chat store
 * - 切换会话时自动重新订阅
 */
export function useRealtimeChat() {
  const gatewayStore = useGatewayStore()
  const chatStore = useChatStore()
  const sessionStore = useSessionStore()

  let unsubMessage: (() => void) | null = null
  let unsubSessions: (() => void) | null = null

  function setupEventHandlers() {
    unsubMessage?.()
    unsubSessions?.()
    unsubMessage = gatewayWs.on('session.message', (event: GatewayEvent) => {
      const payload = event.data as { sessionKey?: string; message?: unknown }
      if (payload?.sessionKey === sessionStore.currentSessionKey && payload?.message) {
        chatStore.addRealtimeMessage(payload.message)
      }
    })
    unsubSessions = gatewayWs.on('sessions.changed', () => {
      sessionStore.fetchSessions()
    })
  }

  function cleanupEventHandlers() {
    unsubMessage?.()
    unsubSessions?.()
    unsubMessage = null
    unsubSessions = null
  }

  /** 连接 WebSocket */
  async function connectWs() {
    if (gatewayWs.connectionState === 'connected') return
    try {
      await gatewayWs.connect()
      setupEventHandlers()
      if (sessionStore.currentSessionKey) {
        gatewayWs.subscribeSession(sessionStore.currentSessionKey)
      }
    } catch (error) {
      console.warn('[Realtime] WebSocket 连接失败，使用 HTTP 轮询:', error)
    }
  }

  /** 监听会话切换，自动重新订阅 */
  watch(
    () => sessionStore.currentSessionKey,
    (newKey, oldKey) => {
      if (!gatewayWs.isConnected) return
      if (oldKey) gatewayWs.unsubscribeSession(oldKey)
      if (newKey) gatewayWs.subscribeSession(newKey)
    }
  )

  /** 监听 Gateway 状态变化，自动连接/断开 WebSocket */
  watch(
    () => gatewayStore.running,
    async (running) => {
      if (running) {
        await connectWs()
      } else {
        cleanupEventHandlers()
        gatewayWs.disconnect()
      }
    }
  )

  return { connectWs, cleanupEventHandlers }
}
