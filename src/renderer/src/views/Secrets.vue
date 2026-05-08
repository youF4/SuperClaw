<script setup lang="ts">
import { ref, onMounted } from 'vue'
import gatewayApi from '@/lib/gateway'
import { useGatewayStore } from '@/stores/gateway'
import { notify } from '@/composables/useNotification'

const gatewayStore = useGatewayStore()

interface Secret {
  id: string
  name: string
  type: string
  configured: boolean
  updatedAt?: number
}

const secrets = ref<Secret[]>([])
const loading = ref(false)
const reloading = ref(false)

onMounted(async () => {
  await gatewayStore.checkStatus()
  if (gatewayStore.running) await loadSecrets()
})

async function loadSecrets() {
  loading.value = true
  const res = await gatewayApi.secrets.list()
  if (res.ok && res.result) {
    const data = res.result as { secrets?: Secret[] }
    secrets.value = data.secrets || []
  } else {
    notify(`获取密钥列表失败: ${res.error || '未知错误'}`, 'error')
  }
  loading.value = false
}

async function reloadSecrets() {
  reloading.value = true
  const res = await gatewayApi.secrets.reload()
  if (res.ok) {
    notify('密钥已重新加载', 'success')
    await loadSecrets()
  } else {
    notify(`重新加载失败: ${res.error || '未知错误'}`, 'error')
  }
  reloading.value = false
}

function formatTime(ts?: number): string {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN')
}
</script>

<template>
  <div class="secrets-page">
    <div class="page-header">
      <h2>密钥管理</h2>
      <p>管理 API Key 和凭证</p>
    </div>

    <div v-if="!gatewayStore.running" class="gateway-warning">
      <p>Gateway 未运行</p>
      <button @click="gatewayStore.start()">启动 Gateway</button>
    </div>

    <template v-if="gatewayStore.running">
      <div class="actions-bar">
        <button @click="reloadSecrets" :disabled="reloading" class="refresh-btn">
          {{ reloading ? '加载中...' : '重新加载密钥' }}
        </button>
      </div>

      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="secrets.length === 0" class="empty">
        <p>暂无密钥配置</p>
      </div>
      <div v-else class="secrets-grid">
        <div v-for="secret in secrets" :key="secret.id" class="secret-card">
          <div class="secret-header">
            <h3>{{ secret.name }}</h3>
            <span class="secret-type">{{ secret.type }}</span>
          </div>
          <div class="secret-body">
            <div class="secret-row">
              <span class="label">ID：</span>
              <code class="value">{{ secret.id }}</code>
            </div>
            <div class="secret-row">
              <span class="label">状态：</span>
              <span class="badge" :class="secret.configured ? 'configured' : 'unconfigured'">
                {{ secret.configured ? '已配置' : '未配置' }}
              </span>
            </div>
            <div class="secret-row" v-if="secret.updatedAt">
              <span class="label">更新时间：</span>
              <span class="value">{{ formatTime(secret.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.secrets-page { padding: 24px; max-width: 1200px; }
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
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.loading, .empty { text-align: center; padding: 60px 20px; color: #888; }

.secrets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 12px; }
.secret-card {
  background: #1a1a2e; border-radius: 12px; border: 1px solid #2a2a4e; overflow: hidden;
}
.secret-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; background: #2a2a4e;
}
.secret-header h3 { margin: 0; font-size: 15px; color: #fff; }
.secret-type { font-size: 11px; color: #888; background: #0f0f1a; padding: 4px 8px; border-radius: 4px; }
.secret-body { padding: 16px 20px; }
.secret-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 13px; }
.secret-row:last-child { margin-bottom: 0; }
.secret-row .label { color: #888; flex-shrink: 0; }
.secret-row .value { color: #e0e0e0; }
.secret-row code { color: #60a5fa; font-size: 12px; word-break: break-all; }

.badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.badge.configured { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
.badge.unconfigured { background: rgba(107, 114, 128, 0.2); color: #9ca3af; }
</style>
