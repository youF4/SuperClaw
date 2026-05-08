<script setup lang="ts">
import { ref, onMounted } from 'vue'
import gatewayApi from '@/lib/gateway'
import { useGatewayStore } from '@/stores/gateway'
import { notify } from '@/composables/useNotification'

const gatewayStore = useGatewayStore()

interface MemoryStatus {
  dreaming: boolean
  shortTermCount: number
  groundedCount: number
  diaryEntryCount: number
  health: 'good' | 'warning' | 'error'
}

interface DiaryEntry {
  id: string
  timestamp: number
  summary: string
  type: string
  details?: string
}

const memoryStatus = ref<MemoryStatus | null>(null)
const diaryEntries = ref<DiaryEntry[]>([])
const loading = ref(false)
const diaryLoading = ref(false)
const actionRunning = ref(false)
const showDetails = ref(false)

onMounted(async () => {
  await gatewayStore.checkStatus()
  if (gatewayStore.running) {
    await loadData()
  }
})

async function loadData() {
  await Promise.all([loadMemoryStatus(), loadDiary()])
}

async function loadMemoryStatus() {
  loading.value = true
  const res = await gatewayApi.doctor.memory.status()
  if (res.ok && res.result) {
    memoryStatus.value = res.result as MemoryStatus
  } else {
    notify(`获取记忆状态失败: ${res.error || '未知错误'}`, 'error')
  }
  loading.value = false
}

async function loadDiary() {
  diaryLoading.value = true
  const res = await gatewayApi.doctor.memory.dreamDiary()
  if (res.ok && res.result) {
    diaryEntries.value = (res.result as DiaryEntry[]) || []
  } else {
    notify(`获取梦境日记失败: ${res.error || '未知错误'}`, 'error')
  }
  diaryLoading.value = false
}

async function runAction(name: string, fn: () => Promise<unknown>) {
  actionRunning.value = true
  const res = await fn() as { ok: boolean; error?: string }
  if (res.ok) {
    notify(`${name} 成功`, 'success')
    await loadData()
  } else {
    notify(`${name} 失败: ${res.error || '未知错误'}`, 'error')
  }
  actionRunning.value = false
}

function confirmAndRun(name: string, fn: () => Promise<unknown>) {
  if (confirm(`确定要${name}吗？此操作不可撤销。`)) {
    runAction(name, fn)
  }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN')
}

function healthLabel(s: string): string {
  return { good: '良好', warning: '警告', error: '异常' }[s] || s
}
</script>

<template>
  <div class="memory-page">
    <div class="page-header">
      <h2>记忆管理</h2>
      <p>查看和管理 Agent 记忆系统、梦境日志</p>
    </div>

    <div v-if="!gatewayStore.running" class="gateway-warning">
      <p>Gateway 未运行，无法获取记忆状态</p>
      <button @click="gatewayStore.start()">启动 Gateway</button>
    </div>

    <template v-if="gatewayStore.running">
      <!-- 记忆状态 -->
      <section class="section">
        <h3>记忆系统状态</h3>
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="memoryStatus" class="status-grid">
          <div class="stat-card">
            <div class="stat-value" :class="memoryStatus.health">{{ healthLabel(memoryStatus.health) }}</div>
            <div class="stat-label">系统健康</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ memoryStatus.dreaming ? '已启用' : '已禁用' }}</div>
            <div class="stat-label">梦境状态</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ memoryStatus.shortTermCount }}</div>
            <div class="stat-label">短时记忆</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ memoryStatus.groundedCount }}</div>
            <div class="stat-label">固化记忆</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ memoryStatus.diaryEntryCount }}</div>
            <div class="stat-label">梦境条目</div>
          </div>
        </div>
      </section>

      <!-- 操作面板 -->
      <section class="section">
        <h3>维护操作</h3>
        <div class="actions-panel">
          <button @click="runAction('修复梦境工件', () => gatewayApi.doctor.memory.repairDreamingArtifacts())" :disabled="actionRunning" class="action-btn">
            修复梦境工件
          </button>
          <button @click="runAction('重置短时记忆', () => gatewayApi.doctor.memory.resetGroundedShortTerm())" :disabled="actionRunning" class="action-btn">
            重置短时记忆
          </button>
          <button @click="runAction('梦境日记去重', () => gatewayApi.doctor.memory.dedupeDreamDiary())" :disabled="actionRunning" class="action-btn">
            梦境日记去重
          </button>
          <button @click="runAction('回填梦境日记', () => gatewayApi.doctor.memory.backfillDreamDiary())" :disabled="actionRunning" class="action-btn">
            回填梦境日记
          </button>
          <button @click="confirmAndRun('重置梦境日记', () => gatewayApi.doctor.memory.resetDreamDiary())" :disabled="actionRunning" class="action-btn danger">
            重置梦境日记
          </button>
        </div>
      </section>

      <!-- 梦境日志 -->
      <section class="section">
        <div class="section-header">
          <h3>梦境日记</h3>
          <label class="toggle-label">
            <input type="checkbox" v-model="showDetails" />
            显示详情
          </label>
        </div>
        <div v-if="diaryLoading" class="loading">加载中...</div>
        <div v-else-if="diaryEntries.length === 0" class="empty">
          <p>暂无梦境日记条目</p>
        </div>
        <div v-else class="diary-list">
          <div v-for="entry in diaryEntries" :key="entry.id" class="diary-item">
            <div class="diary-header">
              <span class="diary-type">{{ entry.type }}</span>
              <span class="diary-time">{{ formatTime(entry.timestamp) }}</span>
            </div>
            <p class="diary-summary">{{ entry.summary }}</p>
            <p v-if="showDetails && entry.details" class="diary-details">{{ entry.details }}</p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.memory-page {
  padding: 24px;
  max-width: 1200px;
}
.page-header { margin-bottom: 24px; }
.page-header h2 { margin: 0 0 8px; font-size: 24px; color: #fff; }
.page-header p { margin: 0; color: #888; }

.gateway-warning {
  background: #2a2a4e; padding: 16px; border-radius: 8px; margin-bottom: 24px;
  display: flex; align-items: center; gap: 16px;
}
.gateway-warning p { color: #fbbf24; margin: 0; }
.gateway-warning button {
  padding: 8px 16px; background: #4a4a8e; border: none;
  border-radius: 6px; color: #fff; cursor: pointer;
}

.section { margin-bottom: 32px; }
.section h3 { margin: 0 0 16px; font-size: 18px; color: #fff; }
.section-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.section-header h3 { margin: 0; }

.loading, .empty { text-align: center; padding: 60px 20px; color: #888; }

.status-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px;
}
.stat-card {
  background: #1a1a2e; padding: 24px; border-radius: 12px; text-align: center;
  border: 1px solid #2a2a4e;
}
.stat-value { font-size: 24px; font-weight: 600; color: #fff; margin-bottom: 8px; }
.stat-value.good { color: #22c55e; }
.stat-value.warning { color: #fbbf24; }
.stat-value.error { color: #ef4444; }
.stat-label { font-size: 14px; color: #888; }

.actions-panel {
  display: flex; flex-wrap: wrap; gap: 12px;
  background: #1a1a2e; padding: 20px; border-radius: 12px; border: 1px solid #2a2a4e;
}
.action-btn {
  padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer;
  font-size: 14px; background: #4a4a8e; color: #fff;
}
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.action-btn:hover:not(:disabled) { background: #5a5aae; }
.action-btn.danger { background: #7f1d1d; color: #fca5a5; }
.action-btn.danger:hover:not(:disabled) { background: #991b1b; }

.diary-list { display: flex; flex-direction: column; gap: 8px; }
.diary-item {
  background: #1a1a2e; padding: 16px; border-radius: 8px; border: 1px solid #2a2a4e;
}
.diary-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.diary-type {
  font-size: 12px; padding: 2px 8px; border-radius: 4px;
  background: #4a4a8e; color: #fff;
}
.diary-time { font-size: 12px; color: #666; }
.diary-summary { color: #e0e0e0; font-size: 14px; margin: 0; line-height: 1.5; }
.diary-details {
  color: #888; font-size: 13px; margin: 8px 0 0; padding-top: 8px;
  border-top: 1px solid #2a2a4e; line-height: 1.5;
}

.toggle-label {
  font-size: 13px; color: #888; display: flex; align-items: center; gap: 6px; cursor: pointer;
}
</style>
