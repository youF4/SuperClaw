<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGatewayStore } from '@/stores/gateway'
import { useUsageStore } from '@/stores/usage'
import gatewayApi from '@/lib/gateway'
import { notify } from '@/composables/useNotification'

const gatewayStore = useGatewayStore()
const usageStore = useUsageStore()

const activeTab = ref<'usage' | 'config' | 'logs' | 'update' | 'about'>('usage')
const config = ref<Record<string, unknown>>({})
const logs = ref<string[]>([])
const loadingConfig = ref(false)
const loadingLogs = ref(false)
const updateStatus = ref<{ available: boolean; currentVersion?: string; latestVersion?: string } | null>(null)
const updateLoading = ref(false)
const updating = ref(false)

onMounted(async () => {
  await gatewayStore.checkStatus()
  if (gatewayStore.running) {
    await loadCurrentTab()
  }
})

async function loadCurrentTab() {
  switch (activeTab.value) {
    case 'usage':
      await usageStore.fetchStats()
      break
    case 'config':
      await fetchConfig()
      break
    case 'logs':
      await fetchLogs()
      break
  }
}

async function fetchConfig() {
  loadingConfig.value = true
  const response = await gatewayApi.config.get()
  if (response.ok && response.result) {
    config.value = response.result as Record<string, unknown>
  }
  loadingConfig.value = false
}

async function fetchLogs() {
  loadingLogs.value = true
  const response = await gatewayApi.logs.tail(200)
  if (response.ok && response.result) {
    logs.value = (response.result as string[]).reverse()
  }
  loadingLogs.value = false
}

function switchTab(tab: 'usage' | 'config' | 'logs' | 'update' | 'about') {
  activeTab.value = tab
  loadCurrentTab()
}

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`
}

async function checkUpdate() {
  updateLoading.value = true
  const res = await gatewayApi.update.status()
  if (res.ok && res.result) {
    updateStatus.value = res.result as { available: boolean; currentVersion?: string; latestVersion?: string }
  } else {
    notify(`检查更新失败: ${res.error || '未知错误'}`, 'error')
  }
  updateLoading.value = false
}

async function runUpdate() {
  if (!confirm('确定要执行更新吗？Gateway 将会重启。')) return
  updating.value = true
  const res = await gatewayApi.update.run()
  if (res.ok) {
    notify('更新已启动，Gateway 正在重启...', 'success')
  } else {
    notify(`更新失败: ${res.error || '未知错误'}`, 'error')
    updating.value = false
  }
}
</script>

<template>
  <div class="settings-page">
    <div class="page-header">
      <h2>设置</h2>
      <p>查看用量统计、配置和日志</p>
    </div>

    <!-- Gateway 状态提示 -->
    <div v-if="!gatewayStore.running" class="gateway-warning">
      <p>Gateway 未运行</p>
      <button @click="gatewayStore.start()">启动 Gateway</button>
    </div>

    <!-- 标签切换 -->
    <div class="tabs">
      <button
        :class="{ active: activeTab === 'usage' }"
        @click="switchTab('usage')"
      >
        用量统计
      </button>
      <button
        :class="{ active: activeTab === 'config' }"
        @click="switchTab('config')"
      >
        配置
      </button>
      <button
        :class="{ active: activeTab === 'logs' }"
        @click="switchTab('logs')"
      >
        日志
      </button>
      <button
        :class="{ active: activeTab === 'update' }"
        @click="switchTab('update')"
      >
        更新
      </button>
      <button
        :class="{ active: activeTab === 'about' }"
        @click="switchTab('about')"
      >
        关于
      </button>
    </div>

    <!-- 用量统计 -->
    <div v-if="activeTab === 'usage'" class="tab-content">
      <div v-if="usageStore.loading" class="loading">加载中...</div>
      
      <div v-else-if="usageStore.stats" class="usage-section">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ formatNumber(usageStore.stats.totalTokens) }}</div>
            <div class="stat-label">总 Token 数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ formatNumber(usageStore.stats.inputTokens) }}</div>
            <div class="stat-label">输入 Token</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ formatNumber(usageStore.stats.outputTokens) }}</div>
            <div class="stat-label">输出 Token</div>
          </div>
          <div class="stat-card highlight">
            <div class="stat-value">{{ formatCost(usageStore.stats.totalCost) }}</div>
            <div class="stat-label">总费用</div>
          </div>
        </div>

        <h3>按模型统计</h3>
        <div class="model-stats">
          <div
            v-for="(data, model) in usageStore.stats.byModel"
            :key="model"
            class="model-stat-item"
          >
            <span class="model-name">{{ model }}</span>
            <span class="model-tokens">{{ formatNumber(data.tokens) }} tokens</span>
            <span class="model-cost">{{ formatCost(data.cost) }}</span>
          </div>
        </div>
      </div>

      <div v-else class="empty">暂无用量数据</div>
    </div>

    <!-- 配置 -->
    <div v-if="activeTab === 'config'" class="tab-content">
      <div v-if="loadingConfig" class="loading">加载中...</div>
      
      <div v-else class="config-section">
        <pre class="config-json">{{ JSON.stringify(config, null, 2) }}</pre>
      </div>
    </div>

    <!-- 日志 -->
    <div v-if="activeTab === 'logs'" class="tab-content">
      <div v-if="loadingLogs" class="loading">加载中...</div>
      
      <div v-else class="logs-section">
        <div class="logs-actions">
          <button @click="fetchLogs">刷新日志</button>
        </div>
        <div class="logs-container">
          <div v-for="(log, index) in logs" :key="index" class="log-line">
            {{ log }}
          </div>
        </div>
      </div>
    </div>

    <!-- 更新 -->
    <div v-if="activeTab === 'update'" class="tab-content">
      <div class="update-section">
        <h3>Gateway 更新</h3>
        <button @click="checkUpdate" :disabled="updateLoading" class="update-check-btn">
          {{ updateLoading ? '检查中...' : '检查更新' }}
        </button>

        <div v-if="updateStatus" class="update-info">
          <div class="update-row">
            <span class="label">当前版本：</span>
            <span class="value">{{ updateStatus.currentVersion || '-' }}</span>
          </div>
          <div class="update-row">
            <span class="label">最新版本：</span>
            <span class="value">{{ updateStatus.latestVersion || '-' }}</span>
          </div>
          <div class="update-row">
            <span class="label">状态：</span>
            <span class="badge" :class="updateStatus.available ? 'available' : 'latest'">
              {{ updateStatus.available ? '有可用更新' : '已是最新版' }}
            </span>
          </div>
          <button
            v-if="updateStatus.available"
            @click="runUpdate"
            :disabled="updating"
            class="update-run-btn"
          >
            {{ updating ? '更新中...' : '立即更新' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 关于 -->
    <div v-if="activeTab === 'about'" class="tab-content">
      <div class="about-section">
        <h3>SuperClaw</h3>
        <p class="version">版本: 0.2.0</p>
        <p class="description">
          OpenClaw 的中文桌面客户端，功能比 ClawX 更完整。
        </p>
        <div class="links">
          <a href="https://github.com/openclaw/openclaw" target="_blank">OpenClaw 官方仓库</a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  padding: 24px;
  max-width: 1200px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #fff;
}

.page-header p {
  margin: 0;
  color: #888;
}

.gateway-warning {
  background: #2a2a4e;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.gateway-warning p {
  color: #fbbf24;
}

.gateway-warning button {
  padding: 8px 16px;
  background: #4a4a8e;
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.tabs button {
  padding: 10px 20px;
  background: #1a1a2e;
  border: 1px solid #2a2a4e;
  border-radius: 8px;
  color: #a0a0c0;
  cursor: pointer;
  font-size: 14px;
}

.tabs button.active {
  background: #4a4a8e;
  color: #fff;
  border-color: #4a4a8e;
}

.tab-content {
  min-height: 400px;
}

.loading,
.empty {
  text-align: center;
  padding: 60px 20px;
  color: #888;
}

/* 用量统计样式 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: #1a1a2e;
  padding: 24px;
  border-radius: 12px;
  text-align: center;
}

.stat-card.highlight {
  background: linear-gradient(135deg, #4a4a8e 0%, #6366f1 100%);
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #a0a0c0;
}

h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #fff;
}

.model-stats {
  background: #1a1a2e;
  border-radius: 12px;
}

.model-stat-item {
  padding: 12px 16px;
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 16px;
  border-bottom: 1px solid #2a2a4e;
}

.model-stat-item:last-child {
  border-bottom: none;
}

.model-name {
  color: #fff;
  font-size: 14px;
}

.model-tokens {
  color: #a0a0c0;
  font-size: 13px;
}

.model-cost {
  color: #22c55e;
  font-size: 13px;
}

/* 配置样式 */
.config-section {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 16px;
}

.config-json {
  margin: 0;
  color: #e0e0e0;
  font-family: 'Consolas', monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 日志样式 */
.logs-section {
  background: #1a1a2e;
  border-radius: 12px;
}

.logs-actions {
  padding: 12px 16px;
  border-bottom: 1px solid #2a2a4e;
}

.logs-actions button {
  padding: 8px 16px;
  background: #4a4a8e;
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
}

.logs-container {
  max-height: 500px;
  overflow-y: auto;
  padding: 16px;
}

.log-line {
  font-family: 'Consolas', monospace;
  font-size: 12px;
  color: #a0a0c0;
  padding: 4px 0;
  border-bottom: 1px solid #1a1a2e;
}

/* 关于样式 */
.about-section {
  background: #1a1a2e;
  padding: 32px;
  border-radius: 12px;
  text-align: center;
}

.about-section h3 {
  font-size: 24px;
  margin-bottom: 8px;
}

.version {
  color: #888;
  margin-bottom: 16px;
}

.update-section {
  background: #1a1a2e; padding: 24px; border-radius: 12px; border: 1px solid #2a2a4e;
}
.update-section h3 { margin: 0 0 20px; color: #fff; font-size: 18px; }
.update-check-btn {
  padding: 10px 20px; background: #4a4a8e; border: none; border-radius: 8px;
  color: #fff; cursor: pointer; font-size: 14px;
}
.update-check-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.update-info { margin-top: 20px; }
.update-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #2a2a4e; }
.update-row:last-child { border-bottom: none; }
.update-row .label { color: #888; font-size: 14px; min-width: 100px; }
.update-row .value { color: #e0e0e0; }
.badge.available { background: rgba(251, 191, 36, 0.2); color: #fbbf24; padding: 4px 10px; border-radius: 12px; font-size: 12px; }
.badge.latest { background: rgba(34, 197, 94, 0.2); color: #22c55e; padding: 4px 10px; border-radius: 12px; font-size: 12px; }
.update-run-btn {
  margin-top: 20px; padding: 12px 24px; background: #22c55e; border: none;
  border-radius: 8px; color: #fff; cursor: pointer; font-size: 14px;
}
.update-run-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.description {
  color: #a0a0c0;
  margin-bottom: 24px;
  line-height: 1.6;
}

.links a {
  color: #60a5fa;
  text-decoration: none;
}

.links a:hover {
  text-decoration: underline;
}
</style>