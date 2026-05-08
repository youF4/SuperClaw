/**
 * OpenClaw Gateway WebSocket 客户端
 *
 * 基于 OpenClaw Gateway 的 WebSocket 协议实现：
 *   1. 连接后发送 connect 请求（身份握手）
 *   2. 收到 hello-ok 确认后开始收发 RPC
 *   3. 服务端推送事件（event frames）用于实时更新
 *
 * 协议参考: openclaw/src/gateway/protocol.md
 *           openclaw/ui/src/ui/gateway.ts
 */

import { GATEWAY_WS_URL } from './config'

// ─── 类型定义 ────────────────────────────────────────────

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
  | 'shutdown'
  | 'tick'

export interface GatewayEvent {
  type: GatewayEventType
  data: unknown
  seq?: number
}

export type EventHandler = (event: GatewayEvent) => void

/** WS 连接状态 */
export type WsConnectionState = 'disconnected' | 'connecting' | 'handshaking' | 'connected'

/** connect 方法的 resolve */
type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout>
}

// ─── 客户端 ──────────────────────────────────────────────

class GatewayWebSocket {
  private ws: WebSocket | null = null
  private handlers = new Map<GatewayEventType, Set<EventHandler>>()
  private pending = new Map<string, PendingRequest>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private maxReconnectDelay = 30000
  private reqId = 0

  /** 当前连接状态 */
  connectionState: WsConnectionState = 'disconnected'

  /** 已连接并且握手完成 */
  get isConnected(): boolean {
    return this.connectionState === 'connected'
  }

  // ── 连接管理 ──

  /**
   * 连接到 Gateway 并完成身份握手
   * @param role    连接角色（默认 operator）
   * @param scopes  权限范围
   */
  async connect(role = 'operator', scopes?: string[]): Promise<void> {
    if (this.connectionState === 'connecting' || this.connectionState === 'handshaking') {
      throw new Error('Already connecting')
    }
    if (this.connectionState === 'connected') return

    this.connectionState = 'connecting'

    return new Promise((outerResolve, outerReject) => {
      try {
        this.ws = new WebSocket(GATEWAY_WS_URL)

        this.ws.onopen = () => {
          console.log('[Gateway WS] 连接已建立')
          this.connectionState = 'handshaking'
          this.reconnectDelay = 1000

          // 发送 connect 握手
          this.sendRequest('connect', {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: 'superclaw',
              version: '0.2.0',
              platform: 'win32',
              mode: 'webchat',
            },
            role,
            scopes: scopes ?? ['operator.read', 'operator.write'],
            caps: [],
            userAgent: 'SuperClaw/0.2.0',
            locale: 'zh-CN',
          })
            .then(() => {
              this.connectionState = 'connected'
              console.log('[Gateway WS] 握手完成')
              outerResolve()
            })
            .catch((err) => {
              this.connectionState = 'disconnected'
              console.error('[Gateway WS] 握手失败:', err)
              outerReject(err)
            })
        }

        this.ws.onmessage = (event) => {
          try {
            const frame = JSON.parse(event.data)
            this.handleFrame(frame)
          } catch (error) {
            console.error('[Gateway WS] 解析失败:', error)
          }
        }

        this.ws.onerror = () => {
          this.connectionState = 'disconnected'
          outerReject(new Error('WebSocket 连接失败'))
        }

        this.ws.onclose = () => {
          const wasConnected = this.connectionState === 'connected'
          this.connectionState = 'disconnected'
          // 清理所有 pending 请求
          for (const [, p] of this.pending) {
            clearTimeout(p.timer)
            p.reject(new Error('Connection closed'))
          }
          this.pending.clear()
          if (wasConnected) {
            this.scheduleReconnect()
          }
        }
      } catch (error) {
        this.connectionState = 'disconnected'
        outerReject(error)
      }
    })
  }

  /** 断开连接 */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    for (const [, p] of this.pending) {
      clearTimeout(p.timer)
      p.reject(new Error('Disconnected'))
    }
    this.pending.clear()
    if (this.ws) {
      this.ws.onclose = null // 阻止触发自动重连
      this.ws.close()
      this.ws = null
    }
    this.connectionState = 'disconnected'
  }

  // ── 事件订阅 ──

  /** 订阅事件 */
  on(eventType: GatewayEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    this.handlers.get(eventType)!.add(handler)

    return () => {
      this.handlers.get(eventType)?.delete(handler)
    }
  }

  // ── RPC 调用 ──

  /** 发送 RPC 请求并等待响应 */
  request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    return this.sendRequest(method, params) as Promise<T>
  }

  /** 订阅会话消息 */
  subscribeSession(sessionKey: string): void {
    this.send('sessions.subscribe', { sessionKey })
  }

  /** 取消订阅会话 */
  unsubscribeSession(sessionKey: string): void {
    this.send('sessions.unsubscribe', { sessionKey })
  }

  // ── 内部方法 ──

  private sendRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const id = String(++this.reqId)

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Request timeout: ${method}`))
      }, 15000)

      this.pending.set(id, { resolve, reject, timer })

      this.send(method, params, id)
    })
  }

  private send(method: string, params?: Record<string, unknown>, id?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[Gateway WS] 未连接，无法发送:', method)
      return
    }

    this.ws.send(
      JSON.stringify({
        type: 'req',
        id: id ?? String(++this.reqId),
        method,
        params: params || {},
      })
    )
  }

  private handleFrame(frame: { type?: string; id?: string; method?: string; event?: string; payload?: unknown; seq?: number; error?: { message: string } }): void {
    // 响应帧: type=res, id, ok, payload/error
    if (frame.type === 'res' && frame.id) {
      const pending = this.pending.get(frame.id)
      if (pending) {
        clearTimeout(pending.timer)
        this.pending.delete(frame.id)
        if (frame.error) {
          pending.reject(new Error(frame.error.message))
        } else {
          pending.resolve(frame.payload)
        }
      }
      return
    }

    // 事件帧: type=event, event, payload, seq?
    if (frame.type === 'event' && frame.event) {
      const eventType = frame.event as GatewayEventType
      const handlers = this.handlers.get(eventType)
      if (handlers) {
        const event: GatewayEvent = {
          type: eventType,
          data: frame.payload,
          seq: frame.seq,
        }
        handlers.forEach((handler) => handler(event))
      }
      return
    }

    // 服务端请求（hello-ok）: type=hello-ok 等
    if (frame.type === 'hello-ok') {
      // hello-ok 是对 connect 的响应，由 sendRequest 的 Promise 处理
      // 但这里也需要处理以完成 connect() 的 Promise
      return
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      console.log('[Gateway WS] 重连中...')
      this.connect().catch(() => {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
      })
    }, this.reconnectDelay)
  }
}

export const gatewayWs = new GatewayWebSocket()
export default gatewayWs
