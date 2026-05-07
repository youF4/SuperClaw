<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import gatewayApi from '@/lib/gateway'
import { useGatewayStore } from '@/stores/gateway'
import { notify } from '@/composables/useNotification'

const gatewayStore = useGatewayStore()

interface Session {
  key: string
  name?: string
  createdAt: number
}

interface Artifact {
  id: string
  name: string
  type: 'image' | 'code' | 'text' | 'file'
  size: number
  createdAt: number
  mimeType?: string
  sessionKey?: string
}

interface ArtifactDetail {
  id: string
  name: string
  type: string
  size: number
  mimeType: string
  createdAt: number
  sessionKey: string
  downloadUrl?: string
  data?: string
}

const sessions = ref<Session[]>([])
const selectedSession = ref<string | null>(null)
const artifacts = ref<Artifact[]>([])
const selectedArtifact = ref<ArtifactDetail | null>(null)
const loading = ref(false)
const detailLoading = ref(false)
const loadingSessions = ref(false)

onMounted(async () => {
  await gatewayStore.checkStatus()
  if (gatewayStore.running) {
    await loadSessions()
  }
})

async function loadSessions() {
  loadingSessions.value = true
  const res = await gatewayApi.sessions.list()
  if (res.ok && res.result) {
    sessions.value = res.result as Session[]
  }
  loadingSessions.value = false
}

async function loadArtifacts() {
  if (!selectedSession.value) return
  loading.value = true
  const res = await gatewayApi.artifacts.list(selectedSession.value)
  if (res.ok && res.result) {
    artifacts.value = res.result as Artifact[]
  } else {
    notify(`获取工件列表失败: ${res.error || '未知错误'}`, 'error')
  }
  loading.value = false
}

async function selectArtifact(artifactId: string) {
  detailLoading.value = true
  selectedArtifact.value = null
  const res = await gatewayApi.artifacts.get(artifactId)
  if (res.ok && res.result) {
    selectedArtifact.value = res.result as ArtifactDetail
  } else {
    notify(`获取工件详情失败: ${res.error || '未知错误'}`, 'error')
  }
  detailLoading.value = false
}

async function downloadArtifact(artifactId: string) {
  const res = await gatewayApi.artifacts.download(artifactId)
  if (res.ok && res.result) {
    const data = res.result as { data?: string; url?: string; filename?: string }
    if (data.url) {
      window.open(data.url, '_blank')
    } else if (data.data) {
      // 如果是 base64，创建一个下载链接
      const link = document.createElement('a')
      link.href = data.data
      link.download = data.filename || `artifact-${artifactId}`
      link.click()
    }
    notify('工件下载已触发', 'success')
  } else {
    notify(`下载失败: ${res.error || '未知错误'}`, 'error')
  }
}

watch(selectedSession, () => {
  artifacts.value = []
  selectedArtifact.value = null
  if (selectedSession.value) loadArtifacts()
})

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN')
}

function typeIcon(type: string): string {
  return { image: '🖼️', code: '📄', text: '📝', file: '📎' }[type] || '📎'
}

function typeLabel(type: string): string {
  return { image: '图片', code: '代码', text: '文本', file: '文件' }[type] || type
}
</script>

<template>
  <div class="artifacts-page">
    <div class="page-header">
      <h2>工件管理</h2>
      <p>查看和下载会话中产生的文件工件</p>
    </div>

    <div v-if="!gatewayStore.running" class="gateway-warning">
      <p>Gateway 未运行，无法获取工件列表</p>
      <button @click="gatewayStore.start()">启动 Gateway</button>
    </div>

    <template v-if="gatewayStore.running">
      <!-- 会话选择 -->
      <div class="session-selector">
        <label>选择会话：</label>
        <select v-model="selectedSession" :disabled="loadingSessions">
          <option value="" disabled>-- 请选择会话 --</option>
          <option v-for="s in sessions" :key="s.key" :value="s.key">
            {{ s.name || s.key.slice(0, 20) + '...' }}
          </option>
        </select>
      </div>

      <div class="content-layout">
        <!-- 工件列表 -->
        <div class="artifacts-section">
          <h3>工件列表</h3>
          <div v-if="!selectedSession" class="empty"><p>请先选择一个会话</p></div>
          <div v-else-if="loading" class="loading">加载中...</div>
          <div v-else-if="artifacts.length === 0" class="empty"><p>此会话暂无工件</p></div>
          <div v-else class="artifacts-grid">
            <div
              v-for="art in artifacts"
              :key="art.id"
              class="artifact-card"
              :class="{ selected: selectedArtifact?.id === art.id }"
              @click="selectArtifact(art.id)"
            >
              <div class="artifact-icon">{{ typeIcon(art.type) }}</div>
              <div class="artifact-info">
                <span class="artifact-name">{{ art.name }}</span>
                <span class="artifact-meta">{{ typeLabel(art.type) }} · {{ formatSize(art.size) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 工件详情 -->
        <div class="detail-section" v-if="selectedArtifact">
          <h3>工件详情</h3>
          <div v-if="detailLoading" class="loading">加载中...</div>
          <div v-else class="detail-panel">
            <div class="detail-header">
              <span class="detail-icon">{{ typeIcon(selectedArtifact.type) }}</span>
              <h4>{{ selectedArtifact.name }}</h4>
            </div>
            <div class="detail-meta">
              <div class="meta-row"><span class="label">ID：</span><span class="value mono">{{ selectedArtifact.id }}</span></div>
              <div class="meta-row"><span class="label">类型：</span><span class="value">{{ selectedArtifact.type }}</span></div>
              <div class="meta-row"><span class="label">MIME：</span><span class="value">{{ selectedArtifact.mimeType || '-' }}</span></div>
              <div class="meta-row"><span class="label">大小：</span><span class="value">{{ formatSize(selectedArtifact.size) }}</span></div>
              <div class="meta-row"><span class="label">创建时间：</span><span class="value">{{ formatTime(selectedArtifact.createdAt) }}</span></div>
            </div>
            <button @click="downloadArtifact(selectedArtifact.id)" class="download-btn">
              下载工件
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.artifacts-page { padding: 24px; max-width: 1400px; }
.page-header { margin-bottom: 24px; }
.page-header h2 { margin: 0 0 8px; font-size: 24px; color: #fff; }
.page-header p { margin: 0; color: #888; }

.gateway-warning {
  background: #2a2a4e; padding: 16px; border-radius: 8px; margin-bottom: 24px;
  display: flex; align-items: center; gap: 16px;
}
.gateway-warning p { color: #fbbf24; margin: 0; }
.gateway-warning button { padding: 8px 16px; background: #4a4a8e; border: none; border-radius: 6px; color: #fff; cursor: pointer; }

.session-selector {
  display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
  background: #1a1a2e; padding: 16px; border-radius: 10px; border: 1px solid #2a2a4e;
}
.session-selector label { color: #a0a0c0; font-size: 14px; flex-shrink: 0; }
.session-selector select {
  flex: 1; padding: 10px 12px; background: #0f0f1a; border: 1px solid #2a2a4e;
  border-radius: 6px; color: #fff; font-size: 14px; cursor: pointer;
}
.session-selector select:focus { outline: none; border-color: #4a4a8e; }

.content-layout { display: grid; grid-template-columns: 1fr 380px; gap: 20px; align-items: start; }

.artifacts-section h3, .detail-section h3 { margin: 0 0 16px; font-size: 16px; color: #fff; }

.loading, .empty { text-align: center; padding: 40px 20px; color: #888; }

.artifacts-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
.artifact-card {
  display: flex; align-items: center; gap: 12px; padding: 12px 16px;
  background: #1a1a2e; border-radius: 8px; border: 1px solid #2a2a4e; cursor: pointer;
  transition: border-color 0.2s;
}
.artifact-card:hover { border-color: #4a4a8e; }
.artifact-card.selected { border-color: #6366f1; background: #2a2a4e; }
.artifact-icon { font-size: 24px; flex-shrink: 0; }
.artifact-info { display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
.artifact-name { font-size: 14px; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.artifact-meta { font-size: 12px; color: #666; }

.detail-panel {
  background: #1a1a2e; padding: 24px; border-radius: 12px; border: 1px solid #2a2a4e;
}
.detail-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.detail-icon { font-size: 32px; }
.detail-header h4 { margin: 0; font-size: 18px; color: #fff; word-break: break-all; }

.detail-meta { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
.meta-row { font-size: 13px; }
.meta-row .label { color: #888; }
.meta-row .value { color: #e0e0e0; }
.meta-row .mono { font-family: Consolas, monospace; font-size: 12px; word-break: break-all; }

.download-btn {
  width: 100%; padding: 12px; background: #4a4a8e; border: none;
  border-radius: 8px; color: #fff; cursor: pointer; font-size: 14px;
}
.download-btn:hover { background: #5a5aae; }
</style>
