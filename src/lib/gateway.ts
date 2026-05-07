/**
 * OpenClaw Gateway API 客户端
 * 通过 HTTP/WebSocket 与 Gateway 通信
 */

import { GATEWAY_HTTP_URL } from './config'

export interface GatewayResponse<T = unknown> {
  ok: boolean
  result?: T
  error?: string
}

/**
 * HTTP 调用 Gateway API
 */
export async function callGateway<T = unknown>(
  method: string,
  params?: Record<string, unknown>
): Promise<GatewayResponse<T>> {
  try {
    const response = await fetch(`${GATEWAY_HTTP_URL}/api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params: params || {},
        id: Date.now(),
      }),
    })

    const data = await response.json()
    return {
      ok: !data.error,
      result: data.result,
      error: data.error?.message,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Gateway API 方法封装
 */
export const gatewayApi = {
  // 健康检查
  health: () => callGateway('health'),

  // 聊天
  chat: {
    send: (sessionId: string, message: string) =>
      callGateway('chat.send', { sessionKey: sessionId, text: message }),
    history: (sessionId: string, limit = 50) =>
      callGateway('chat.history', { sessionKey: sessionId, limit }),
    abort: (sessionId: string) =>
      callGateway('chat.abort', { sessionKey: sessionId }),
  },

  // 会话
  sessions: {
    list: () => callGateway('sessions.list'),
    create: (agentId?: string) =>
      callGateway('sessions.create', { agentId }),
    delete: (sessionId: string) =>
      callGateway('sessions.delete', { sessionKey: sessionId }),
    reset: (sessionId: string) =>
      callGateway('sessions.reset', { sessionKey: sessionId }),
    compact: (sessionId: string) =>
      callGateway('sessions.compact', { sessionKey: sessionId }),
  },

  // 通道
  channels: {
    status: () => callGateway('channels.status'),
    start: (channelId: string) =>
      callGateway('channels.start', { channelId }),
    stop: (channelId: string) =>
      callGateway('channels.stop', { channelId }),
  },

  // 模型
  models: {
    list: () => callGateway('models.list'),
    authStatus: () => callGateway('models.authStatus'),
  },

  // 技能
  skills: {
    status: () => callGateway('skills.status'),
    search: (query: string) =>
      callGateway('skills.search', { query }),
    install: (skillId: string) =>
      callGateway('skills.install', { skillId }),
    update: (skillId: string) =>
      callGateway('skills.update', { skillId }),
    uninstall: (skillId: string) =>
      callGateway('skills.uninstall', { skillId }),
  },

  // Cron
  cron: {
    list: () => callGateway('cron.list'),
    add: (job: unknown) =>
      callGateway('cron.add', { job }),
    remove: (jobId: string) =>
      callGateway('cron.remove', { jobId }),
    run: (jobId: string) =>
      callGateway('cron.run', { jobId }),
  },

  // Agents
  agents: {
    list: () => callGateway('agents.list'),
    create: (config: unknown) =>
      callGateway('agents.create', { config }),
    update: (agentId: string, config: unknown) =>
      callGateway('agents.update', { agentId, config }),
    delete: (agentId: string) =>
      callGateway('agents.delete', { agentId }),
  },

  // 配置
  config: {
    get: () => callGateway('config.get'),
    set: (config: unknown) =>
      callGateway('config.set', { config }),
    patch: (patch: unknown) =>
      callGateway('config.patch', { patch }),
  },

  // 用量统计
  usage: {
    status: () => callGateway('usage.status'),
    cost: () => callGateway('usage.cost'),
  },

  // 日志
  logs: {
    tail: (lines = 100) =>
      callGateway('logs.tail', { lines }),
  },

  // 诊断
  doctor: {
    memory: {
      status: () => callGateway('doctor.memory.status'),
    },
  },
}

export default gatewayApi
