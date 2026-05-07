<script setup lang="ts">
import { ref, onMounted } from 'vue'
import gatewayApi from '@/lib/gateway'
import { useGatewayStore } from '@/stores/gateway'
import { notify } from '@/composables/useNotification'

const gatewayStore = useGatewayStore()

interface Environment {
  id: string
  name: string
  type: string
  status: 'online' | 'offline'
  capabilities?: string[]
}

interface Node {
  id: string
  name: string
  type: string
  status: 'connected' | 'disconnected' | 'pending'
  lastSeen?: number
  pairedAt?: number
}

interface NodeDetail {
  id: string
  name: string
  type: string
  status: string
  capabilities: string[]
  pairedAt: number
  metadata?: Record<string, string>
}

const environments = ref<Environment[]>([])
const nodes = ref<Node[]>([])
const expandedNode = ref<string | null>(null)
const nodeDetail = ref<NodeDetail | null>(null)
const detailLoading = ref(false)
const loading = ref(false)
const renaming = ref<{ id: string; name: string } | null>(null)

onMounted(async () => {
  await gatewayStore.checkStatus()
  if (gatewayStore.running) {
    await loadAll()
  }
})

async function loadAll() {
  loading.value = true
  await Promise.all([loadEnvironments(), loadNodes()])
  loading.value = false
}

async function loadEnvironments() {
  const res = await gatewayApi.environments.list()
  if (res.ok && res.result) {
    environments.value = (res.result as Environment[]) || []
  }
}

async function loadNodes() {
  const res = await gatewayApi.node.list()
  if (res.ok && res.result) {
    nodes.value = (res.result as Node[]) || []
  } else {
    notify(`获取节点列表失败: ${res.error || '未知错误'}`, 'error')
  }
}

async function toggleNodeDetail(nodeId: string) {
  if (expandedNode.value === nodeId) {
    expandedNode.value = null
    nodeDetail.value = null
    return
  }
  expandedNode.value = nodeId
  detailLoading.value = true
  const res = await gatewayApi.node.describe(nodeId)
  if (res.ok && res.result) {
    nodeDetail.value = res.result as NodeDetail
  } else {
    notify(`获取节点详情失败: ${res.error || '未知错误'}`, 'error')
  }
  detailLoading.value = false
}

async function approveNode(nodeId: string) {
  const res = await gatewayApi.node.pair.approve(nodeId)
  if (res.ok) { notify('节点已批准', 'success'); await loadNodes() }
  else { notify(`批准失败: ${res.error || '未知错误'}`, 'error') }
}

async function rejectNode(nodeId: string) {
  const res = await gatewayApi.node.pair.reject(nodeId)
  if (res.ok) { notify('节点已拒绝', 'info'); await loadNodes() }
  else { notify(`拒绝失败: ${res.error || '未知错误'}`, 'error') }
}

async function removeNode(nodeId: string) {
  if (!confirm('确定要移除此节点吗？')) return
  const res = await gatewayApi.node.pair.remove(nodeId)
  if (res.ok) { notify('节点已移除', 'info'); await loadNodes() }
  else { notify(`移除失败: ${res.error || '未知错误'}`, 'error') }
}

async function renameNode(nodeId: string) {
  if (!renaming.value || !renaming.value.name.trim()) return
  const res = await gatewayApi.node.rename(nodeId, renaming.value.name.trim())
  if (res.ok) { notify('节点已重命名', 'success'); renaming.value = null; await loadNodes() }
  else { notify(`重命名失败: ${res.error || '未知错误'}`, 'error') }
}

function formatTime(ts?: number): string {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN')
}

function statusLabel(s: string): string {
  return { connected: '在线', disconnected: '离线', pending: '待审批', online: '在线', offline: '离线' }[s] || s
}
</script>

<template>
  <div class="environments-page">
    <div class="page-header">
      <h2>环境与节点</h2>
      <p>查看 Gateway 环境和连接的节点</p>
    </div>

    <div v-if="!gatewayStore.running" class="gateway-warning">
      <p>Gateway 未运行，无法获取环境信息</p>
      <button @click="gatewayStore.start()">启动 Gateway</button>
    </div>

    <template v-if="gatewayStore.running">
      <div class="actions-bar">
        <button @click="loadAll" :disabled="loading" class="refresh-btn">刷新</button>
      </div>

      <!-- 环境概览 -->
      <section class="section">
        <h3>环境概览</h3>
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else class="env-grid">
          <div v-for="env in environments" :key="env.id" class="env-card">
            <div class="env-header">
              <span class="status-dot" :class="env.status"></span>
              <h4>{{ env.name || env.id }}</h4>
            </div>
            <div class="env-type">{{ env.type }}</div>
            <div class="env-status">{{ statusLabel(env.status) }}</div>
            <div v-if="env.capabilities && env.capabilities.length" class="capabilities">
              <span v-for="cap in env.capabilities" :key="cap" class="cap-tag">{{ cap }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 节点列表 -->
      <section class="section">
        <h3>节点</h3>
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="nodes.length === 0" class="empty"><p>暂无节点</p></div>
        <div v-else class="node-list">
          <div v-for="node in nodes" :key="node.id" class="node-card">
            <div class="node-main" @click="toggleNodeDetail(node.id)">
              <div class="node-header">
                <span class="status-dot" :class="node.status"></span>
                <h4>{{ node.name || node.id.slice(0, 16) }}</h4>
                <span class="node-status-badge" :class="node.status">{{ statusLabel(node.status) }}</span>
              </div>
              <div class="node-meta">
                <span class="node-type">{{ node.type }}</span>
                <span class="node-time">最后在线：{{ formatTime(node.lastSeen) }}</span>
              </div>
            </div>

            <!-- 操作列 -->
            <div class="node-actions" v-if="node.status === 'pending'">
              <button @click.stop="approveNode(node.id)" class="btn-approve">批准</button>
              <button @click.stop="rejectNode(node.id)" class="btn-reject">拒绝</button>
            </div>
            <div class="node-actions" v-else>
              <button @click.stop="removeNode(node.id)" class="btn-remove">移除</button>
              <button @click.stop="renaming = { id: node.id, name: node.name || '' }" class="btn-outline">重命名</button>
            </div>
          </div>

          <!-- 重命名对话框 -->
          <div v-if="renaming" class="rename-dialog">
            <div class="rename-box">
              <h4>重命名节点</h4>
              <input v-model="renaming.name" type="text" placeholder="输入新名称" @keyup.enter="renameNode(renaming.id)" />
              <div class="rename-actions">
                <button @click="renaming = null" class="cancel-btn">取消</button>
                <button @click="renameNode(renaming.id)" class="confirm-btn">确认</button>
              </div>
            </div>
          </div>

          <!-- 节点详情 -->
          <div v-if="expandedNode && nodeDetail" class="detail-panel">
            <h4>节点详情</h4>
            <div v-if="detailLoading" class="loading">加载中...</div>
            <div v-else class="detail-grid">
              <div class="detail-item"><span class="label">ID：</span><span class="value mono">{{ nodeDetail.id }}</span></div>
              <div class="detail-item"><span class="label">名称：</span><span class="value">{{ nodeDetail.name }}</span></div>
              <div class="detail-item"><span class="label">类型：</span><span class="value">{{ nodeDetail.type }}</span></div>
              <div class="detail-item"><span class="label">状态：</span><span class="value">{{ nodeDetail.status }}</span></div>
              <div class="detail-item"><span class="label">配对时间：</span><span class="value">{{ formatTime(nodeDetail.pairedAt) }}</span></div>
              <div class="detail-item">
                <span class="label">能力：</span>
                <div class="capabilities">
                  <span v-for="cap in nodeDetail.capabilities" :key="cap" class="cap-tag">{{ cap }}</span>
                  <span v-if="!nodeDetail.capabilities || !nodeDetail.capabilities.length" class="value">-</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.environments-page { padding: 24px; max-width: 1200px; }
.page-header { margin-bottom: 24px; }
.page-header h2 { margin: 0 0 8px; font-size: 24px; color: #fff; }
.page-header p { margin: 0; color: #888; }

.gateway-warning {
  background: #2a2a4e; padding: 16px; border-radius: 8px; margin-bottom: 24px;
  display: flex; align-items: center; gap: 16px;
}
.gateway-warning p { color: #fbbf24; margin: 0; }
.gateway-warning button { padding: 8px 16px; background: #4a4a8e; border: none; border-radius: 6px; color: #fff; cursor: pointer; }

.actions-bar { margin-bottom: 16px; }
.refresh-btn { padding: 8px 16px; background: #4a4a8e; border: none; border-radius: 6px; color: #fff; cursor: pointer; font-size: 13px; }

.section { margin-bottom: 32px; }
.section h3 { margin: 0 0 16px; font-size: 18px; color: #fff; }

.loading, .empty { text-align: center; padding: 40px 20px; color: #888; }

.env-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
.env-card {
  background: #1a1a2e; padding: 20px; border-radius: 12px; border: 1px solid #2a2a4e;
}
.env-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.env-header h4 { margin: 0; font-size: 16px; color: #fff; }
.env-type { font-size: 12px; color: #666; margin-bottom: 4px; }
.env-status { font-size: 13px; color: #a0a0c0; margin-bottom: 12px; }

.node-list { display: flex; flex-direction: column; gap: 8px; }
.node-card {
  background: #1a1a2e; border-radius: 10px; border: 1px solid #2a2a4e;
  padding: 16px; display: flex; justify-content: space-between; align-items: center; gap: 16px;
}
.node-main { flex: 1; cursor: pointer; }
.node-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.node-header h4 { margin: 0; font-size: 15px; color: #fff; }

.status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.status-dot.online, .status-dot.connected { background: #22c55e; }
.status-dot.offline, .status-dot.disconnected { background: #6b7280; }
.status-dot.pending { background: #fbbf24; }

.node-status-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; }
.node-status-badge.connected { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
.node-status-badge.disconnected { background: rgba(107, 114, 128, 0.2); color: #9ca3af; }
.node-status-badge.pending { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }

.node-meta { display: flex; gap: 16px; font-size: 12px; color: #666; }
.node-type { color: #888; }

.node-actions { display: flex; gap: 8px; flex-shrink: 0; }
.node-actions button { padding: 6px 14px; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; }
.btn-approve { background: #22c55e; color: #fff; }
.btn-reject { background: #ef4444; color: #fff; }
.btn-remove { background: #6b7280; color: #fff; }
.btn-outline { background: #2a2a4e; color: #a0a0c0; border: 1px solid #4a4a8e !important; }

.detail-panel {
  background: #0f0f1a; padding: 20px; border-radius: 10px; border: 1px solid #2a2a4e; margin-top: 8px;
}
.detail-panel h4 { margin: 0 0 16px; font-size: 16px; color: #fff; }
.detail-grid { display: flex; flex-direction: column; gap: 10px; }
.detail-item { font-size: 13px; }
.detail-item .label { color: #888; }
.detail-item .value { color: #e0e0e0; }
.detail-item .mono { font-family: Consolas, monospace; font-size: 12px; }

.capabilities { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.cap-tag {
  font-size: 11px; padding: 4px 8px; background: #2a2a4e; border-radius: 4px; color: #a0a0c0;
}

.rename-dialog {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.rename-box {
  background: #1a1a2e; padding: 24px; border-radius: 12px; width: 400px; max-width: 90%;
}
.rename-box h4 { margin: 0 0 16px; color: #fff; }
.rename-box input {
  width: 100%; padding: 10px 12px; background: #0f0f1a; border: 1px solid #2a2a4e;
  border-radius: 6px; color: #fff; font-size: 14px; box-sizing: border-box;
}
.rename-box input:focus { outline: none; border-color: #4a4a8e; }
.rename-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }
.cancel-btn { padding: 10px 20px; background: #2a2a4e; border: none; border-radius: 6px; color: #a0a0c0; cursor: pointer; }
.confirm-btn { padding: 10px 20px; background: #4a4a8e; border: none; border-radius: 6px; color: #fff; cursor: pointer; }
</style>
