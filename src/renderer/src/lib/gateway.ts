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
    describe: (sessionKey: string) =>
      callGateway('sessions.describe', { sessionKey }),
    preview: (sessionKey: string, limit = 10) =>
      callGateway('sessions.preview', { sessionKey, limit }),
  },

  // 通道
  channels: {
    status: () => callGateway('channels.status'),
    start: (channelId: string) =>
      callGateway('channels.start', { channelId }),
    stop: (channelId: string) =>
      callGateway('channels.stop', { channelId }),
    logout: (channelId: string) =>
      callGateway('channels.logout', { channelId }),
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
    detail: (skillId: string) =>
      callGateway('skills.detail', { skillId }),
    install: (skillId: string) =>
      callGateway('skills.install', { skillId }),
    update: (skillId: string) =>
      callGateway('skills.update', { skillId }),
    uninstall: (skillId: string) =>
      callGateway('skills.uninstall', { skillId }),
    bins: () => callGateway('skills.bins'),
  },

  // Cron
  cron: {
    list: () => callGateway('cron.list'),
    status: () => callGateway('cron.status'),
    add: (job: unknown) =>
      callGateway('cron.add', { job }),
    update: (jobId: string, job: unknown) =>
      callGateway('cron.update', { jobId, job }),
    remove: (jobId: string) =>
      callGateway('cron.remove', { jobId }),
    run: (jobId: string) =>
      callGateway('cron.run', { jobId }),
    runs: (jobId: string) =>
      callGateway('cron.runs', { jobId }),
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
    files: {
      list: (agentId: string) =>
        callGateway('agents.files.list', { agentId }),
      get: (agentId: string, path: string) =>
        callGateway('agents.files.get', { agentId, path }),
      set: (agentId: string, path: string, content: string) =>
        callGateway('agents.files.set', { agentId, path, content }),
    },
  },

  // 配置
  config: {
    get: () => callGateway('config.get'),
    set: (config: unknown) =>
      callGateway('config.set', { config }),
    patch: (patch: unknown) =>
      callGateway('config.patch', { patch }),
    schema: () => callGateway('config.schema'),
    schemaLookup: (path: string) =>
      callGateway('config.schema.lookup', { path }),
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

  // ========================================
  // Phase 1: 记忆管理 (Memory / Doctor)
  // ========================================
  doctor: {
    memory: {
      status: () => callGateway('doctor.memory.status'),
      dreamDiary: () => callGateway('doctor.memory.dreamDiary'),
      resetDreamDiary: () => callGateway('doctor.memory.resetDreamDiary'),
      resetGroundedShortTerm: () => callGateway('doctor.memory.resetGroundedShortTerm'),
      repairDreamingArtifacts: () => callGateway('doctor.memory.repairDreamingArtifacts'),
      dedupeDreamDiary: () => callGateway('doctor.memory.dedupeDreamDiary'),
      backfillDreamDiary: () => callGateway('doctor.memory.backfillDreamDiary'),
    },
  },

  // ========================================
  // Phase 1: 设备管理 (Device)
  // ========================================
  device: {
    pair: {
      list: () => callGateway('device.pair.list'),
      approve: (deviceId: string) =>
        callGateway('device.pair.approve', { deviceId }),
      reject: (deviceId: string) =>
        callGateway('device.pair.reject', { deviceId }),
      remove: (deviceId: string) =>
        callGateway('device.pair.remove', { deviceId }),
    },
    token: {
      rotate: (deviceId: string) =>
        callGateway('device.token.rotate', { deviceId }),
      revoke: (deviceId: string) =>
        callGateway('device.token.revoke', { deviceId }),
    },
  },

  // ========================================
  // Phase 1: 工具箱 (Tools)
  // ========================================
  tools: {
    catalog: (agentId?: string) =>
      callGateway('tools.catalog', { agentId }),
    effective: (sessionKey: string) =>
      callGateway('tools.effective', { sessionKey }),
    invoke: (toolName: string, args: unknown, sessionKey?: string) =>
      callGateway('tools.invoke', { toolName, args, sessionKey }),
  },
  commands: {
    list: (agentId?: string) =>
      callGateway('commands.list', { agentId }),
  },

  // ========================================
  // Phase 1: 环境/节点 (Environments & Nodes)
  // ========================================
  environments: {
    list: () => callGateway('environments.list'),
    status: () => callGateway('environments.status'),
  },
  node: {
    list: () => callGateway('node.list'),
    describe: (nodeId: string) =>
      callGateway('node.describe', { nodeId }),
    rename: (nodeId: string, name: string) =>
      callGateway('node.rename', { nodeId, name }),
    pair: {
      list: () => callGateway('node.pair.list'),
      approve: (nodeId: string) =>
        callGateway('node.pair.approve', { nodeId }),
      reject: (nodeId: string) =>
        callGateway('node.pair.reject', { nodeId }),
      remove: (nodeId: string) =>
        callGateway('node.pair.remove', { nodeId }),
    },
    invoke: (nodeId: string, command: string, args?: unknown) =>
      callGateway('node.invoke', { nodeId, command, args }),
  },

  // ========================================
  // Phase 1: 工件管理 (Artifacts)
  // ========================================
  artifacts: {
    list: (sessionKey: string) =>
      callGateway('artifacts.list', { sessionKey }),
    get: (artifactId: string) =>
      callGateway('artifacts.get', { artifactId }),
    download: (artifactId: string) =>
      callGateway('artifacts.download', { artifactId }),
  },

  // ========================================
  // Phase 2: 语音/TTS
  // ========================================
  tts: {
    status: () => callGateway('tts.status'),
    providers: () => callGateway('tts.providers'),
    personas: () => callGateway('tts.personas'),
    enable: () => callGateway('tts.enable'),
    disable: () => callGateway('tts.disable'),
    setProvider: (provider: string) =>
      callGateway('tts.setProvider', { provider }),
    setPersona: (persona: string) =>
      callGateway('tts.setPersona', { persona }),
    convert: (text: string, options?: Record<string, unknown>) =>
      callGateway('tts.convert', { text, ...options }),
  },
  talk: {
    catalog: () => callGateway('talk.catalog'),
    config: () => callGateway('talk.config'),
    mode: (mode?: string) =>
      callGateway('talk.mode', mode !== undefined ? { mode } : {}),
    speak: (text: string) =>
      callGateway('talk.speak', { text }),
  },
  voicewake: {
    get: () => callGateway('voicewake.get'),
    set: (config: unknown) =>
      callGateway('voicewake.set', { config }),
    routing: {
      get: () => callGateway('voicewake.routing.get'),
      set: (rules: unknown) =>
        callGateway('voicewake.routing.set', { rules }),
    },
  },

  // ========================================
  // Phase 2: 执行审批 & 插件审批
  // ========================================
  execApproval: {
    get: (approvalId: string) =>
      callGateway('exec.approval.get', { approvalId }),
    list: () => callGateway('exec.approval.list'),
    resolve: (approvalId: string, approved: boolean, reason?: string) =>
      callGateway('exec.approval.resolve', { approvalId, approved, reason }),
  },
  execApprovals: {
    get: () => callGateway('exec.approvals.get'),
    set: (config: unknown) =>
      callGateway('exec.approvals.set', { config }),
    nodeGet: (nodeId: string) =>
      callGateway('exec.approvals.node.get', { nodeId }),
    nodeSet: (nodeId: string, config: unknown) =>
      callGateway('exec.approvals.node.set', { nodeId, config }),
  },
  pluginApproval: {
    list: () => callGateway('plugin.approval.list'),
    resolve: (approvalId: string, approved: boolean) =>
      callGateway('plugin.approval.resolve', { approvalId, approved }),
  },

  // ========================================
  // Phase 2: 密钥管理
  // ========================================
  secrets: {
    reload: () => callGateway('secrets.reload'),
    /** 获取密钥列表（无 commandId 时返回所有密钥） */
    list: (commandId?: string) =>
      callGateway('secrets.resolve', { commandId }),
    /** @deprecated 请使用 secrets.list() */
    resolve: (commandId?: string) =>
      callGateway('secrets.resolve', { commandId }),
  },

  // ========================================
  // Phase 3: 更新 & 系统
  // ========================================
  update: {
    status: () => callGateway('update.status'),
    run: () => callGateway('update.run'),
  },
  gateway: {
    identity: {
      get: () => callGateway('gateway.identity.get'),
    },
    restart: {
      request: (reason?: string) =>
        callGateway('gateway.restart.request', { reason }),
      preflight: () => callGateway('gateway.restart.preflight'),
    },
  },
  system: {
    presence: () => callGateway('system-presence'),
    event: (event: string, data: unknown) =>
      callGateway('system-event', { event, data }),
  },
  diagnostics: {
    stability: () => callGateway('diagnostics.stability'),
  },
  status: () => callGateway('status'),
  wizard: {
    start: () => callGateway('wizard.start'),
    status: () => callGateway('wizard.status'),
    cancel: () => callGateway('wizard.cancel'),
  },
  push: {
    vapidPublicKey: () => callGateway('push.web.vapidPublicKey'),
    subscribe: (subscription: unknown) =>
      callGateway('push.web.subscribe', { subscription }),
    unsubscribe: () => callGateway('push.web.unsubscribe'),
  },
}

export default gatewayApi
