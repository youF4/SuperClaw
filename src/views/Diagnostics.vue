<script setup lang="ts">
import { ref, onMounted } from 'vue'
import gatewayApi from '@/lib/gateway'
import { useGatewayStore } from '@/stores/gateway'

const gatewayStore = useGatewayStore()

interface StabilityReport {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  memoryUsage: number
  eventLoopLag: number
  activeConnections: number
  issues?: string[]
}

interface PresenceEntry {
  id: string
  type: string
  name: string
  status: 'online' | 'offline'
  lastSeen: number
}

interface GatewayIdentity {
  deviceId: string
  publicKey: string
}

const activeTab = ref<'stability' | 'presence' | 'identity'>('stability')
const stability = ref<StabilityReport | null>(null)
const presenceEntries = ref<PresenceEntry[]>([])
const identity = ref<GatewayIdentity | null>(null)
const loading = ref(false)

onMounted(async () => {
  await gatewayStore.checkStatus()
  if (gatewayStore.running) await loadAll()
})

async function loadAll() {
  loading.value = true
  await Promise.all([loadStability(), loadPresence(), loadIdentity()])
  loading.value = false
}

async function loadStability() {
  const res = await gatewayApi.diagnostics.stability()
  if (res.ok && res.result) stability.value = res.result as StabilityReport
}

async function loadPresence() {
  const res = await gatewayApi.system.presence()
  if (res.ok && res.result) {
    const data = res.result as { entries?: PresenceEntry[] }
    presenceEntries.value = data.entries || []
  }
}

async function loadIdentity() {
  const res = await gatewayApi.gateway.identity.get()
  if (res.ok && res.result) identity.value = res.result as GatewayIdentity
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN')
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${d}天 ${h}小时 ${m}分钟`
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function statusLabel(s: string): string {
  return { healthy: '健康', degraded: '降级', unhealthy: '异常', online: '在线', offline: '离线' }[s] || s
}
</script>

<template>
  <div class="diagnostics-page">
    <div class="page-header">
      <h2>系统诊断</h2>
      <p>Gateway 健康状态、连接状态和系统信息</p>
    </div>

    <div v-if="!gatewayStore.running" class="gateway-warning">
      <p>Gateway 未运行</p>
      <button @click="gatewayStore.start()">启动 Gateway</button>
    </div>

    <template v-if="gatewayStore.running">
      <div class="tabs">
        <button :class="{ active: activeTab === 'stability' }" @click="activeTab = 'stability'">健康状态</button>
        <button :class="{ active: activeTab === 'presence' }" @click="activeTab = 'presence'">在线状态</button>
        <button :class="{ active: activeTab === 'identity' }" @click="activeTab = 'identity'">网关身份</button>
      </div>

      <div class="tab-content">
        <!-- 健康状态 -->
        <div v-if="activeTab === 'stability'">
          <div v-if="loading" class="loading">加载中...</div>
          <div v-else-if="stability" class="status-cards">
            <div class="big-stat-card">
              <div class="big-value" :class="stability.status">{{ statusLabel(stability.status) }}</div>
              <div class="big-label">系统状态</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ formatUptime(stability.uptime) }}</div>
              <div class="stat-label">运行时间</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ formatBytes(stability.memoryUsage) }}</div>
              <div class="stat-label">内存使用</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ stability.eventLoopLag }}ms</div>
              <div class="stat-label">事件循环延迟</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ stability.activeConnections }}</div>
              <div class="stat-label">活跃连接</div>
            </div>

            <div v-if="stability.issues && stability.issues.length" class="issues-panel">
              <h4>异常信息</h4>
              <div v-for="(issue, index) in stability.issues" :key="index" class="issue-item">
                ⚠️ {{ issue }}
              </div>
            </div>
          </div>
        </div>

        <!-- 在线状态 -->
        <div v-if="activeTab === 'presence'">
          <div v-if="loading" class="loading">加载中...</div>
          <div v-else-if="presenceEntries.length === 0" class="empty"><p>暂无在线状态信息</p></div>
          <div v-else class="presence-list">
            <div v-for="entry in presenceEntries" :key="entry.id" class="presence-item">
              <div class="presence-header">
                <span class="status-dot" :class="entry.status"></span>
                <span class="presence-name">{{ entry.name || entry.id }}</span>
                <span class="presence-status">{{ statusLabel(entry.status) }}</span>
              </div>
              <div class="presence-meta">
                <span>类型：{{ entry.type }}</span>
                <span>最后在线：{{ formatTime(entry.lastSeen) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 网关身份 -->
        <div v-if="activeTab === 'identity'">
          <div v-if="loading" class="loading">加载中...</div>
          <div v-else-if="identity" class="identity-panel">
            <div class="identity-row">
              <span class="label">设备 ID：</span>
              <code class="value">{{ identity.deviceId }}</code>
            </div>
            <div class="identity-row">
              <span class="label">公钥：</span>
              <code class="value mono">{{ identity.publicKey }}</code>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.diagnostics-page { padding: 24px; max-width: 1200px; }
.page-header { margin-bottom: 24px; }
.page-header h2 { margin: 0 0 8px; font-size: 24px; color: #fff; }
.page-header p { margin: 0; color: #888; }

.gateway-warning {
  background: #2a2a4e; padding: 16px; border-radius: 8px; margin-bottom: 24px;
  display: flex; align-items: center; gap: 16px;
}
.gateway-warning p { color: #fbbf24; margin: 0; }
.gateway-warning button { padding: 8px 16px; background: #4a4a8e; border: none; border-radius: 6px; color: #fff; cursor: pointer; }

.tabs { display: flex; gap: 8px; margin-bottom: 24px; }
.tabs button {
  padding: 10px 20px; background: #1a1a2e; border: 1px solid #2a2a4e;
  border-radius: 8px; color: #a0a0c0; cursor: pointer; font-size: 14px;
}
.tabs button.active { background: #4a4a8e; color: #fff; border-color: #4a4a8e; }

.loading, .empty { text-align: center; padding: 60px 20px; color: #888; }

.status-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.big-stat-card {
  grid-column: 1 / -1; background: #1a1a2e; padding: 32px; border-radius: 12px;
  text-align: center; border: 1px solid #2a2a4e;
}
.big-value { font-size: 36px; font-weight: 700; margin-bottom: 8px; }
.big-value.healthy { color: #22c55e; }
.big-value.degraded { color: #fbbf24; }
.big-value.unhealthy { color: #ef4444; }
.big-label { font-size: 16px; color: #888; }

.stat-card {
  background: #1a1a2e; padding: 24px; border-radius: 12px; text-align: center; border: 1px solid #2a2a4e;
}
.stat-value { font-size: 20px; font-weight: 600; color: #fff; margin-bottom: 6px; }
.stat-label { font-size: 13px; color: #888; }

.issues-panel {
  grid-column: 1 / -1; background: #7f1d1d; padding: 20px; border-radius: 12px;
  border: 1px solid #991b1b;
}
.issues-panel h4 { margin: 0 0 12px; color: #fca5a5; font-size: 15px; }
.issue-item { color: #fca5a5; font-size: 14px; padding: 6px 0; }

.presence-list { display: flex; flex-direction: column; gap: 8px; }
.presence-item {
  background: #1a1a2e; padding: 16px; border-radius: 10px; border: 1px solid #2a2a4e;
}
.presence-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.status-dot { width: 10px; height: 10px; border-radius: 50%; }
.status-dot.online { background: #22c55e; }
.status-dot.offline { background: #6b7280; }
.presence-name { font-size: 15px; color: #fff; }
.presence-status { margin-left: auto; font-size: 12px; color: #888; }
.presence-meta { display: flex; gap: 16px; font-size: 12px; color: #666; }

.identity-panel {
  background: #1a1a2e; padding: 24px; border-radius: 12px; border: 1px solid #2a2a4e;
}
.identity-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #2a2a4e; }
.identity-row:last-child { border-bottom: none; }
.identity-row .label { color: #888; font-size: 14px; min-width: 80px; flex-shrink: 0; }
.identity-row .value { color: #e0e0e0; font-size: 13px; word-break: break-all; }
.identity-row .mono { font-family: Consolas, monospace; font-size: 12px; }
</style>
