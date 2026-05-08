/**
 * 基于 WebSocket 的实时聊天 composable
 *
 * 当 WebSocket 连接后，自动订阅当前会话的消息事件，
 * 实现消息的实时推送，替代轮询拉取。
 */
import { watch, ref, onMounted, onUnmounted } from 'vue'
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
  let reconnectTimer: NodeJS.Timeout | null = null
  let isConnecting = ref(false)

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
    // 防止重复连接
    if (gatewayWs.connectionState === 'connected' || isConnecting.value) {
      return
    }

    isConnecting.value = true
    try {
      await gatewayWs.connect()
      setupEventHandlers()
      if (sessionStore.currentSessionKey) {
        gatewayWs.subscribeSession(sessionStore.currentSessionKey)
      }
      console.log('[Realtime] WebSocket 连接成功')
    } catch (error) {
      console.warn('[Realtime] WebSocket 连接失败，使用 HTTP 轮询:', error)
    } finally {
      isConnecting.value = false
    }
  }

  /** 启动重连检查 */
  function startReconnectCheck() {
    stopReconnectCheck()
    
    reconnectTimer = setInterval(async () => {
      // 如果 Gateway 运行但 WebSocket 未连接，尝试重连
      if (gatewayStore.running && !gatewayWs.isConnected && !isConnecting.value) {
        console.log('[Realtime] 检测到 WebSocket 断开，尝试重连...')
        await connectWs()
      }
    }, 30000) // 每 30 秒检查一次
  }

  /** 停止重连检查 */
  function stopReconnectCheck() {
    if (reconnectTimer) {
      clearInterval(reconnectTimer)
      reconnectTimer = null
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
        startReconnectCheck()
      } else {
        cleanupEventHandlers()
        stopReconnectCheck()
        gatewayWs.disconnect()
      }
    },
    { immediate: true } // 立即执行
  )

  // 组件卸载时清理
  onUnmounted(() => {
    cleanupEventHandlers()
    stopReconnectCheck()
  })

  return { 
    connectWs, 
    cleanupEventHandlers,
    startReconnectCheck,
    stopReconnectCheck 
  }
}
