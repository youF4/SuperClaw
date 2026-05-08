<script setup lang="ts">
import { ref, onMounted } from 'vue'
import gatewayApi from '@/lib/gateway'
import { useGatewayStore } from '@/stores/gateway'
import { notify } from '@/composables/useNotification'

const gatewayStore = useGatewayStore()

interface VapidKey {
  publicKey: string
}

const vapidKey = ref<VapidKey | null>(null)
const subscribed = ref(false)
const loading = ref(false)

/** 检测是否运行在 Tauri 环境（无 Service Worker 支持） */
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

onMounted(async () => {
  await gatewayStore.checkStatus()
  if (gatewayStore.running) await loadVapidKey()
})

async function loadVapidKey() {
  loading.value = true
  const res = await gatewayApi.push.vapidPublicKey()
  if (res.ok && res.result) vapidKey.value = res.result as VapidKey
  else notify('获取 VAPID 公钥失败', 'error')
  loading.value = false
}

async function subscribePush() {
  if (isTauri) {
    notify('Tauri 桌面端不支持浏览器推送通知', 'error')
    return
  }
  if (!('Notification' in window)) {
    notify('此浏览器不支持推送通知', 'error')
    return
  }
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') {
    notify('推送通知权限被拒绝', 'error')
    return
  }

  // 简单订阅 - 浏览器推送需要 Service Worker
  const swReg = await navigator.serviceWorker.ready
  const pushSub = await swReg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidKey.value?.publicKey || '',
  })

  const res = await gatewayApi.push.subscribe(pushSub.toJSON())
  if (res.ok) {
    subscribed.value = true
    notify('已订阅推送通知', 'success')
  } else {
    notify(`订阅失败: ${res.error}`, 'error')
  }
}

async function unsubscribePush() {
  const res = await gatewayApi.push.unsubscribe()
  if (res.ok) {
    subscribed.value = false
    notify('已取消订阅', 'info')
  } else {
    notify(`取消订阅失败: ${res.error}`, 'error')
  }
}
</script>

<template>
  <div class="push-page">
    <div class="page-header">
      <h2>推送通知</h2>
      <p>管理 Web 推送通知和 APNs 配置</p>
    </div>

    <div v-if="!gatewayStore.running" class="gateway-warning">
      <p>Gateway 未运行</p>
      <button @click="gatewayStore.start()">启动 Gateway</button>
    </div>

    <div v-if="gatewayStore.running" class="content">
      <div v-if="loading" class="loading">加载中...</div>

      <!-- VAPID 密钥 -->
      <section class="section">
        <h3>VAPID 密钥</h3>
        <div class="info-card">
          <div class="info-row">
            <span class="label">公钥：</span>
            <code class="value mono">{{ vapidKey?.publicKey || '加载中...' }}</code>
          </div>
        </div>
      </section>

      <!-- 推送订阅 -->
      <section class="section">
        <h3>浏览器推送</h3>
        <div class="info-card">
          <p class="desc">订阅后可在浏览器后台接收 Gateway 事件通知。</p>
          <div v-if="isTauri" class="tauri-notice">
            ⚠️ Tauri 桌面端暂不支持浏览器推送功能，此页面仅适用于 Web 版。
          </div>
          <div class="sub-status">
            <span class="badge" :class="subscribed ? 'subscribed' : 'unsubscribed'">
              {{ subscribed ? '已订阅' : '未订阅' }}
            </span>
          </div>
          <div class="actions">
            <button v-if="!subscribed && !isTauri" @click="subscribePush" class="action-btn primary">
              订阅推送
            </button>
            <button v-if="subscribed" @click="unsubscribePush" class="action-btn danger">
              取消订阅
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.push-page { padding: 24px; max-width: 1200px; }
.page-header { margin-bottom: 24px; }
.page-header h2 { margin: 0 0 8px; font-size: 24px; color: #fff; }
.page-header p { margin: 0; color: #888; }

.gateway-warning {
  background: #2a2a4e; padding: 16px; border-radius: 8px; margin-bottom: 24px;
  display: flex; align-items: center; gap: 16px;
}
.gateway-warning p { color: #fbbf24; margin: 0; }
.gateway-warning button { padding: 8px 16px; background: #4a4a8e; border: none; border-radius: 6px; color: #fff; cursor: pointer; }

.loading { text-align: center; padding: 60px 20px; color: #888; }

.section { margin-bottom: 32px; }
.section h3 { margin: 0 0 16px; font-size: 18px; color: #fff; }

.info-card {
  background: #1a1a2e; padding: 24px; border-radius: 12px; border: 1px solid #2a2a4e;
}
.info-row { display: flex; align-items: flex-start; gap: 12px; padding: 8px 0; }
.info-row .label { color: #888; font-size: 14px; flex-shrink: 0; }
.info-row .value { color: #e0e0e0; font-size: 13px; word-break: break-all; }
.info-row .mono { font-family: Consolas, monospace; font-size: 12px; }

.desc { color: #a0a0c0; font-size: 14px; margin: 0 0 16px; line-height: 1.6; }
.sub-status { margin-bottom: 16px; }
.badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.badge.subscribed { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
.badge.unsubscribed { background: rgba(107, 114, 128, 0.2); color: #9ca3af; }

.actions { display: flex; gap: 12px; }
.action-btn { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
.action-btn.primary { background: #4a4a8e; color: #fff; }
.action-btn.danger { background: #ef4444; color: #fff; }
.tauri-notice { background: #2a2a4e; padding: 12px 16px; border-radius: 8px; color: #fbbf24; font-size: 13px; margin-bottom: 16px; }
</style>
