/**
 * OpenClaw Gateway WebSocket 客户端
 * 用于实时接收消息和事件
 */

import { GATEWAY_WS_URL } from './config'

export type GatewayEventType =
  | 'agent'
  | 'chat'
  | 'session.message'
  | 'session.tool'
  | 'sessions.changed'
  | 'presence'
  | 'health'
  | 'heartbeat'
  | 'cron'

export interface GatewayEvent {
  type: GatewayEventType
  data: unknown
}

export type EventHandler = (event: GatewayEvent) => void

class GatewayWebSocket {
  private ws: WebSocket | null = null
  private handlers: Map<GatewayEventType, Set<EventHandler>> = new Map()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000

  /**
   * 连接 WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(GATEWAY_WS_URL)

        this.ws.onopen = () => {
          console.log('[Gateway WS] Connected')
          this.reconnectDelay = 1000
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleMessage(data)
          } catch (error) {
            console.error('[Gateway WS] Parse error:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('[Gateway WS] Error:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('[Gateway WS] Disconnected')
          this.scheduleReconnect()
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * 订阅事件
   */
  on(eventType: GatewayEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    this.handlers.get(eventType)!.add(handler)

    // 返回取消订阅函数
    return () => {
      this.handlers.get(eventType)?.delete(handler)
    }
  }

  /**
   * 发送消息
   */
  send(method: string, params?: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          method,
          params: params || {},
          id: Date.now(),
        })
      )
    }
  }

  /**
   * 订阅会话消息
   */
  subscribeSession(sessionKey: string): void {
    this.send('sessions.subscribe', { sessionKey })
  }

  /**
   * 取消订阅会话
   */
  unsubscribeSession(sessionKey: string): void {
    this.send('sessions.unsubscribe', { sessionKey })
  }

  private handleMessage(data: { method?: string; params?: unknown }): void {
    if (data.method && data.params) {
      const eventType = data.method as GatewayEventType
      const handlers = this.handlers.get(eventType)
      if (handlers) {
        const event: GatewayEvent = {
          type: eventType,
          data: data.params,
        }
        handlers.forEach((handler) => handler(event))
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      console.log('[Gateway WS] Reconnecting...')
      this.connect().catch(() => {
        // 重连失败，增加延迟
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
      })
    }, this.reconnectDelay)
  }
}

export const gatewayWs = new GatewayWebSocket()
export default gatewayWs
