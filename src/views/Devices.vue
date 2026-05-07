<script setup lang="ts">
import { ref, onMounted } from 'vue'
import gatewayApi from '@/lib/gateway'
import { useGatewayStore } from '@/stores/gateway'
import { notify } from '@/composables/useNotification'

const gatewayStore = useGatewayStore()

interface Device {
  id: string
  name: string
  pairedAt: number
  status: 'pending' | 'approved' | 'rejected'
  lastSeen?: number
}

const devices = ref<Device[]>([])
const loading = ref(false)

onMounted(async () => {
  await gatewayStore.checkStatus()
  if (gatewayStore.running) {
    await loadDevices()
  }
})

async function loadDevices() {
  loading.value = true
  const res = await gatewayApi.device.pair.list()
  if (res.ok && res.result) {
    devices.value = res.result as Device[]
  } else {
    notify(`获取设备列表失败: ${res.error || '未知错误'}`, 'error')
  }
  loading.value = false
}

async function approveDevice(deviceId: string) {
  const res = await gatewayApi.device.pair.approve(deviceId)
  if (res.ok) {
    notify('设备已批准', 'success')
    await loadDevices()
  } else {
    notify(`批准失败: ${res.error || '未知错误'}`, 'error')
  }
}

async function rejectDevice(deviceId: string) {
  const res = await gatewayApi.device.pair.reject(deviceId)
  if (res.ok) {
    notify('设备已拒绝', 'info')
    await loadDevices()
  } else {
    notify(`拒绝失败: ${res.error || '未知错误'}`, 'error')
  }
}

async function removeDevice(deviceId: string) {
  if (!confirm('确定要移除此设备吗？')) return
  const res = await gatewayApi.device.pair.remove(deviceId)
  if (res.ok) {
    notify('设备已移除', 'info')
    await loadDevices()
  } else {
    notify(`移除失败: ${res.error || '未知错误'}`, 'error')
  }
}

async function rotateToken(deviceId: string) {
  const res = await gatewayApi.device.token.rotate(deviceId)
  if (res.ok) {
    notify('令牌已轮换', 'success')
  } else {
    notify(`轮换令牌失败: ${res.error || '未知错误'}`, 'error')
  }
}

async function revokeToken(deviceId: string) {
  if (!confirm('确定要撤销此设备的令牌吗？此操作不可撤销！')) return
  const res = await gatewayApi.device.token.revoke(deviceId)
  if (res.ok) {
    notify('令牌已撤销', 'info')
  } else {
    notify(`撤销令牌失败: ${res.error || '未知错误'}`, 'error')
  }
}

function formatTime(ts?: number): string {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN')
}

function statusLabel(s: string): string {
  return { pending: '待审批', approved: '已批准', rejected: '已拒绝' }[s] || s
}
</script>

<template>
  <div class="devices-page">
    <div class="page-header">
      <h2>设备管理</h2>
      <p>管理配对的设备和身份令牌</p>
    </div>

    <div v-if="!gatewayStore.running" class="gateway-warning">
      <p>Gateway 未运行，无法获取设备列表</p>
      <button @click="gatewayStore.start()">启动 Gateway</button>
    </div>

    <template v-if="gatewayStore.running">
      <div class="actions-bar">
        <button @click="loadDevices" :disabled="loading" class="refresh-btn">刷新</button>
      </div>

      <div v-if="loading" class="loading">加载中...</div>

      <div v-else-if="devices.length === 0" class="empty">
        <p>暂无配对设备</p>
      </div>

      <div v-else class="device-list">
        <div v-for="device in devices" :key="device.id" class="device-item">
          <div class="device-info">
            <div class="device-header">
              <h3>{{ device.name || '未命名设备' }}</h3>
              <span class="status-badge" :class="device.status">
                {{ statusLabel(device.status) }}
              </span>
            </div>
            <div class="device-meta">
              <div class="meta-item">
                <span class="label">设备 ID：</span>
                <span class="value mono">{{ device.id.slice(0, 20) }}...</span>
              </div>
              <div class="meta-item">
                <span class="label">配对时间：</span>
                <span class="value">{{ formatTime(device.pairedAt) }}</span>
              </div>
              <div class="meta-item" v-if="device.lastSeen">
                <span class="label">最后在线：</span>
                <span class="value">{{ formatTime(device.lastSeen) }}</span>
              </div>
            </div>
          </div>
          <div class="device-actions">
            <template v-if="device.status === 'pending'">
              <button @click="approveDevice(device.id)" class="btn-approve">批准</button>
              <button @click="rejectDevice(device.id)" class="btn-reject">拒绝</button>
            </template>
            <template v-if="device.status === 'approved'">
              <button @click="removeDevice(device.id)" class="btn-remove">移除</button>
              <div class="token-actions">
                <button @click="rotateToken(device.id)" class="btn-outline">轮换令牌</button>
                <button @click="revokeToken(device.id)" class="btn-danger-outline">撤销令牌</button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.devices-page { padding: 24px; max-width: 1200px; }
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
.refresh-btn {
  padding: 8px 16px; background: #4a4a8e; border: none;
  border-radius: 6px; color: #fff; cursor: pointer; font-size: 13px;
}

.loading, .empty { text-align: center; padding: 60px 20px; color: #888; }
.empty button { margin-top: 16px; padding: 10px 20px; background: #4a4a8e; border: none; border-radius: 8px; color: #fff; cursor: pointer; }

.device-list { display: flex; flex-direction: column; gap: 12px; }
.device-item {
  background: #1a1a2e; border-radius: 12px; border: 1px solid #2a2a4e;
  padding: 20px; display: flex; justify-content: space-between; gap: 20px;
}
.device-info { flex: 1; }
.device-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.device-header h3 { margin: 0; font-size: 16px; color: #fff; }

.status-badge {
  padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500;
}
.status-badge.pending { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.status-badge.approved { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
.status-badge.rejected { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

.device-meta { display: flex; flex-direction: column; gap: 6px; }
.meta-item { font-size: 13px; }
.meta-item .label { color: #888; }
.meta-item .value { color: #e0e0e0; }
.meta-item .mono { font-family: Consolas, monospace; font-size: 12px; }

.device-actions { display: flex; flex-direction: column; gap: 8px; justify-content: flex-start; }
.device-actions button {
  padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;
}
.btn-approve { background: #22c55e; color: #fff; }
.btn-reject { background: #ef4444; color: #fff; }
.btn-remove { background: #6b7280; color: #fff; }
.btn-outline { background: #2a2a4e; color: #a0a0c0; border: 1px solid #4a4a8e !important; }
.btn-danger-outline { background: #2a2a4e; color: #ef4444; border: 1px solid #7f1d1d !important; }
.token-actions { display: flex; gap: 8px; }
</style>
