<script setup lang="ts">
import gatewayApi, { type GatewayResponse } from '@/lib/gateway'
import { notify } from '@/composables/useNotification'
import { useGatewayData, useGatewayPage } from '@/composables/useGatewayData'

interface Device {
  id: string
  name: string
  pairedAt: number
  status: 'pending' | 'approved' | 'rejected'
  lastSeen?: number
}

const { gatewayStore } = useGatewayPage()
const { data: devices, loading, load: loadDevices } = useGatewayData<Device[]>(
  () => gatewayApi.device.pair.list() as Promise<GatewayResponse<Device[]>>,
  { immediate: false, onError: msg => notify(`获取设备列表失败: ${msg}`, 'error') }
)

/** 确认对话框（模板中无法直接访问 window.confirm） */
function confirmAction(msg: string): boolean { return window.confirm(msg) }

/** 执行设备操作：调用 API → 通知 → 刷新列表 */
async function deviceAction(
  label: string,
  action: () => Promise<{ ok: boolean; error?: string }>,
  reload = true
) {
  const res = await action()
  if (res.ok) {
    notify(`${label}成功`, 'success')
    if (reload) await loadDevices()
  } else {
    notify(`${label}失败: ${res.error || '未知错误'}`, 'error')
  }
}

function formatTime(ts?: number): string {
  return ts ? new Date(ts).toLocaleString('zh-CN') : '-'
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

      <div v-else-if="!devices || devices.length === 0" class="empty">
        <p>暂无配对设备</p>
      </div>

      <div v-else class="device-list">
        <div v-for="device in devices" :key="device.id" class="device-item">
          <div class="device-info">
            <div class="device-header">
              <h3>{{ device.name || '未命名设备' }}</h3>
              <span class="status-badge" :class="device.status">
                {{ { pending: '待审批', approved: '已批准', rejected: '已拒绝' }[device.status] || device.status }}
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
              <button @click="deviceAction('批准', () => gatewayApi.device.pair.approve(device.id))" class="btn-approve">批准</button>
              <button @click="deviceAction('拒绝', () => gatewayApi.device.pair.reject(device.id))" class="btn-reject">拒绝</button>
            </template>
            <template v-if="device.status === 'approved'">
              <button @click="confirmAction('确定要移除此设备吗？') && deviceAction('移除', () => gatewayApi.device.pair.remove(device.id))" class="btn-remove">移除</button>
              <div class="token-actions">
                <button @click="deviceAction('轮换令牌', () => gatewayApi.device.token.rotate(device.id), false)" class="btn-outline">轮换令牌</button>
                <button @click="confirmAction('确定要撤销此设备的令牌吗？此操作不可撤销！') && deviceAction('撤销令牌', () => gatewayApi.device.token.revoke(device.id), false)" class="btn-danger-outline">撤销令牌</button>
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
