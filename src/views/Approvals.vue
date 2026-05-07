<script setup lang="ts">
import { ref, onMounted } from 'vue'
import gatewayApi from '@/lib/gateway'
import { useGatewayStore } from '@/stores/gateway'
import { notify } from '@/composables/useNotification'

const gatewayStore = useGatewayStore()

interface ExecApproval {
  id: string
  command: string
  targetId: string
  requestedAt: number
  status: 'pending' | 'approved' | 'rejected'
  requestedBy?: string
}

interface PluginApproval {
  id: string
  pluginId: string
  pluginName: string
  requestedAt: number
  status: 'pending' | 'approved' | 'rejected'
}

interface ExecApprovalsConfig {
  policy: string
  defaultAction: 'allow' | 'deny'
}

const activeTab = ref<'exec' | 'plugin' | 'config'>('exec')
const execApprovals = ref<ExecApproval[]>([])
const pluginApprovals = ref<PluginApproval[]>([])
const execConfig = ref<ExecApprovalsConfig | null>(null)
const loading = ref(false)

onMounted(async () => {
  await gatewayStore.checkStatus()
  if (gatewayStore.running) await loadAll()
})

async function loadAll() {
  loading.value = true
  await Promise.all([loadExecApprovals(), loadPluginApprovals(), loadExecConfig()])
  loading.value = false
}

async function loadExecApprovals() {
  const res = await gatewayApi.execApproval.list()
  if (res.ok && res.result) execApprovals.value = res.result as ExecApproval[]
}

async function loadPluginApprovals() {
  const res = await gatewayApi.pluginApproval.list()
  if (res.ok && res.result) pluginApprovals.value = res.result as PluginApproval[]
}

async function loadExecConfig() {
  const res = await gatewayApi.execApprovals.get()
  if (res.ok && res.result) execConfig.value = res.result as ExecApprovalsConfig
}

async function resolveExec(id: string, approved: boolean) {
  const res = await gatewayApi.execApproval.resolve(id, approved)
  if (res.ok) {
    notify(`执行${approved ? '已批准' : '已拒绝'}`, approved ? 'success' : 'info')
    await loadExecApprovals()
  } else notify(`操作失败: ${res.error}`, 'error')
}

async function resolvePlugin(id: string, approved: boolean) {
  const res = await gatewayApi.pluginApproval.resolve(id, approved)
  if (res.ok) {
    notify(`插件${approved ? '已批准' : '已拒绝'}`, approved ? 'success' : 'info')
    await loadPluginApprovals()
  } else notify(`操作失败: ${res.error}`, 'error')
}

async function saveExecConfig() {
  if (!execConfig.value) return
  const res = await gatewayApi.execApprovals.set(execConfig.value)
  if (res.ok) notify('执行审批配置已保存', 'success')
  else notify(`保存失败: ${res.error}`, 'error')
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN')
}
</script>

<template>
  <div class="approvals-page">
    <div class="page-header">
      <h2>审批中心</h2>
      <p>管理执行审批和插件审批请求</p>
    </div>

    <div v-if="!gatewayStore.running" class="gateway-warning">
      <p>Gateway 未运行</p>
      <button @click="gatewayStore.start()">启动 Gateway</button>
    </div>

    <template v-if="gatewayStore.running">
      <div class="tabs">
        <button :class="{ active: activeTab === 'exec' }" @click="activeTab = 'exec'">执行审批</button>
        <button :class="{ active: activeTab === 'plugin' }" @click="activeTab = 'plugin'">插件审批</button>
        <button :class="{ active: activeTab === 'config' }" @click="activeTab = 'config'">审批策略</button>
      </div>

      <!-- 执行审批 -->
      <div v-if="activeTab === 'exec'" class="tab-content">
        <div class="actions-bar">
          <button @click="loadExecApprovals" class="refresh-btn">刷新</button>
        </div>
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="execApprovals.length === 0" class="empty"><p>暂无待处理的执行审批</p></div>
        <div v-else class="approval-list">
          <div v-for="item in execApprovals" :key="item.id" class="approval-item">
            <div class="approval-info">
              <div class="approval-header">
                <code class="approval-command">{{ item.command }}</code>
                <span class="status-badge" :class="item.status">
                  {{ item.status === 'pending' ? '待审批' : item.status === 'approved' ? '已批准' : '已拒绝' }}
                </span>
              </div>
              <div class="approval-meta">
                <span>目标：{{ item.targetId }}</span>
                <span>请求时间：{{ formatTime(item.requestedAt) }}</span>
                <span v-if="item.requestedBy">请求者：{{ item.requestedBy }}</span>
              </div>
            </div>
            <div v-if="item.status === 'pending'" class="approval-actions">
              <button @click="resolveExec(item.id, true)" class="btn-approve">批准</button>
              <button @click="resolveExec(item.id, false)" class="btn-reject">拒绝</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 插件审批 -->
      <div v-if="activeTab === 'plugin'" class="tab-content">
        <div class="actions-bar">
          <button @click="loadPluginApprovals" class="refresh-btn">刷新</button>
        </div>
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="pluginApprovals.length === 0" class="empty"><p>暂无待处理的插件审批</p></div>
        <div v-else class="approval-list">
          <div v-for="item in pluginApprovals" :key="item.id" class="approval-item">
            <div class="approval-info">
              <div class="approval-header">
                <span class="plugin-name">{{ item.pluginName || item.pluginId }}</span>
                <span class="status-badge" :class="item.status">
                  {{ item.status === 'pending' ? '待审批' : item.status === 'approved' ? '已批准' : '已拒绝' }}
                </span>
              </div>
              <div class="approval-meta">
                <span>插件 ID：{{ item.pluginId }}</span>
                <span>请求时间：{{ formatTime(item.requestedAt) }}</span>
              </div>
            </div>
            <div v-if="item.status === 'pending'" class="approval-actions">
              <button @click="resolvePlugin(item.id, true)" class="btn-approve">批准</button>
              <button @click="resolvePlugin(item.id, false)" class="btn-reject">拒绝</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 审批策略配置 -->
      <div v-if="activeTab === 'config'" class="tab-content">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="execConfig" class="config-panel">
          <div class="config-row">
            <span class="label">默认策略</span>
            <span class="badge" :class="execConfig.defaultAction">
              {{ execConfig.defaultAction === 'allow' ? '默认允许' : '默认拒绝' }}
            </span>
          </div>
          <div class="config-row">
            <span class="label">策略模式</span>
            <span class="value">{{ execConfig.policy || '未设置' }}</span>
          </div>
          <div class="config-row">
            <label class="toggle-label">
              <input type="checkbox" v-model="execConfig.defaultAction" true-value="allow" false-value="deny" />
              允许所有执行请求（高风险）
            </label>
          </div>
          <button @click="saveExecConfig" class="save-btn">保存配置</button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.approvals-page { padding: 24px; max-width: 1200px; }
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

.actions-bar { margin-bottom: 16px; }
.refresh-btn { padding: 8px 16px; background: #4a4a8e; border: none; border-radius: 6px; color: #fff; cursor: pointer; font-size: 13px; }

.loading, .empty { text-align: center; padding: 60px 20px; color: #888; }

.approval-list { display: flex; flex-direction: column; gap: 8px; }
.approval-item {
  background: #1a1a2e; padding: 16px; border-radius: 10px; border: 1px solid #2a2a4e;
  display: flex; justify-content: space-between; align-items: center; gap: 16px;
}
.approval-info { flex: 1; }
.approval-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.approval-command { font-size: 14px; color: #60a5fa; background: #0f0f1a; padding: 4px 8px; border-radius: 4px; word-break: break-all; }
.plugin-name { font-size: 15px; color: #fff; font-weight: 500; }

.status-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.status-badge.pending { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.status-badge.approved { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
.status-badge.rejected { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

.approval-meta { display: flex; gap: 16px; font-size: 12px; color: #666; flex-wrap: wrap; }

.approval-actions { display: flex; gap: 8px; flex-shrink: 0; }
.approval-actions button { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
.btn-approve { background: #22c55e; color: #fff; }
.btn-reject { background: #ef4444; color: #fff; }

.config-panel {
  background: #1a1a2e; padding: 24px; border-radius: 12px; border: 1px solid #2a2a4e;
}
.config-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #2a2a4e; }
.config-row:last-child { border-bottom: none; }
.config-row .label { color: #888; font-size: 14px; min-width: 100px; }
.config-row .value { color: #e0e0e0; }
.badge.allow { background: rgba(34, 197, 94, 0.2); color: #22c55e; padding: 4px 10px; border-radius: 12px; font-size: 12px; }
.badge.deny { background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 4px 10px; border-radius: 12px; font-size: 12px; }

.toggle-label { display: flex; align-items: center; gap: 8px; color: #a0a0c0; font-size: 14px; cursor: pointer; }
.toggle-label input { width: 18px; height: 18px; cursor: pointer; }

.save-btn { margin-top: 20px; padding: 12px 24px; background: #4a4a8e; border: none; border-radius: 8px; color: #fff; cursor: pointer; font-size: 14px; }
</style>
