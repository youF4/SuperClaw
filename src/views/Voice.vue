<script setup lang="ts">
import { ref, onMounted } from 'vue'
import gatewayApi from '@/lib/gateway'
import { useGatewayStore } from '@/stores/gateway'
import { notify } from '@/composables/useNotification'

const gatewayStore = useGatewayStore()

interface TtsStatus {
  enabled: boolean
  provider: string
  persona: string
  providers: string[]
  personas: string[]
}

interface TalkConfig {
  mode: string
  providers: string[]
}

interface VoicewakeConfig {
  enabled: boolean
  triggerWords: string[]
}

const activeTab = ref<'tts' | 'talk' | 'voicewake'>('tts')
const ttsStatus = ref<TtsStatus | null>(null)
const talkConfig = ref<TalkConfig | null>(null)
const voicewakeConfig = ref<VoicewakeConfig | null>(null)
const loading = ref(false)

const editMode = ref<'tts' | null>(null)
const editProvider = ref('')
const editPersona = ref('')

onMounted(async () => {
  await gatewayStore.checkStatus()
  if (gatewayStore.running) {
    await loadAll()
  }
})

async function loadAll() {
  loading.value = true
  await Promise.all([loadTts(), loadTalk(), loadVoicewake()])
  loading.value = false
}

async function loadTts() {
  const res = await gatewayApi.tts.status()
  if (res.ok && res.result) ttsStatus.value = res.result as TtsStatus
  else notify('获取 TTS 状态失败', 'error')
}

async function loadTalk() {
  const res = await gatewayApi.talk.config()
  if (res.ok && res.result) talkConfig.value = res.result as TalkConfig
}

async function loadVoicewake() {
  const res = await gatewayApi.voicewake.get()
  if (res.ok && res.result) voicewakeConfig.value = res.result as VoicewakeConfig
}

async function toggleTts() {
  if (!ttsStatus.value) return
  if (ttsStatus.value.enabled) {
    const res = await gatewayApi.tts.disable()
    if (res.ok) { notify('TTS 已禁用', 'info'); await loadTts() }
    else notify(`禁用失败: ${res.error}`, 'error')
  } else {
    const res = await gatewayApi.tts.enable()
    if (res.ok) { notify('TTS 已启用', 'success'); await loadTts() }
    else notify(`启用失败: ${res.error}`, 'error')
  }
}

async function saveTtsSettings() {
  const promises: Promise<unknown>[] = []
  if (editProvider.value && editProvider.value !== ttsStatus.value?.provider) {
    promises.push(gatewayApi.tts.setProvider(editProvider.value))
  }
  if (editPersona.value && editPersona.value !== ttsStatus.value?.persona) {
    promises.push(gatewayApi.tts.setPersona(editPersona.value))
  }
  await Promise.all(promises)
  editMode.value = null
  notify('TTS 设置已保存', 'success')
  await loadTts()
}

async function toggleVoicewake() {
  if (!voicewakeConfig.value) return
  const newConfig = { ...voicewakeConfig.value, enabled: !voicewakeConfig.value.enabled }
  const res = await gatewayApi.voicewake.set(newConfig)
  if (res.ok) { notify(`语音唤醒已${newConfig.enabled ? '启用' : '禁用'}`, 'success'); await loadVoicewake() }
  else notify(`设置失败: ${res.error}`, 'error')
}
</script>

<template>
  <div class="voice-page">
    <div class="page-header">
      <h2>语音与 TTS</h2>
      <p>配置文本转语音、语音对话和语音唤醒</p>
    </div>

    <div v-if="!gatewayStore.running" class="gateway-warning">
      <p>Gateway 未运行</p>
      <button @click="gatewayStore.start()">启动 Gateway</button>
    </div>

    <template v-if="gatewayStore.running">
      <div class="tabs">
        <button :class="{ active: activeTab === 'tts' }" @click="activeTab = 'tts'">文本转语音</button>
        <button :class="{ active: activeTab === 'talk' }" @click="activeTab = 'talk'">语音对话</button>
        <button :class="{ active: activeTab === 'voicewake' }" @click="activeTab = 'voicewake'">语音唤醒</button>
      </div>

      <!-- TTS -->
      <div v-if="activeTab === 'tts'" class="tab-content">
        <div v-if="loading" class="loading">加载中...</div>
        <template v-else-if="ttsStatus">
          <div class="status-card">
            <div class="status-row">
              <span class="label">状态</span>
              <span class="badge" :class="ttsStatus.enabled ? 'enabled' : 'disabled'">
                {{ ttsStatus.enabled ? '已启用' : '已禁用' }}
              </span>
              <button @click="toggleTts" class="toggle-btn">
                {{ ttsStatus.enabled ? '禁用' : '启用' }}
              </button>
            </div>
            <div class="status-row">
              <span class="label">当前提供商</span>
              <span class="value">{{ ttsStatus.provider || '-' }}</span>
            </div>
            <div class="status-row">
              <span class="label">当前音色</span>
              <span class="value">{{ ttsStatus.persona || '-' }}</span>
            </div>
            <button @click="editMode = 'tts'; editProvider = ttsStatus.provider; editPersona = ttsStatus.persona" class="action-btn">
              修改设置
            </button>
          </div>

          <div v-if="editMode === 'tts'" class="edit-panel">
            <h4>TTS 设置</h4>
            <div class="form-group">
              <label>提供商</label>
              <select v-model="editProvider">
                <option value="">-- 选择 --</option>
                <option v-for="p in ttsStatus.providers" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>音色</label>
              <select v-model="editPersona">
                <option value="">-- 选择 --</option>
                <option v-for="p in ttsStatus.personas" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
            <div class="form-actions">
              <button @click="editMode = null" class="cancel-btn">取消</button>
              <button @click="saveTtsSettings" class="confirm-btn">保存</button>
            </div>
          </div>
        </template>
      </div>

      <!-- Talk -->
      <div v-if="activeTab === 'talk'" class="tab-content">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="talkConfig" class="status-card">
          <div class="status-row">
            <span class="label">对话模式</span>
            <span class="value">{{ talkConfig.mode || '未设置' }}</span>
          </div>
          <div class="status-row">
            <span class="label">可用提供商</span>
            <span class="value">{{ talkConfig.providers?.join(', ') || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- Voicewake -->
      <div v-if="activeTab === 'voicewake'" class="tab-content">
        <div v-if="loading" class="loading">加载中...</div>
        <template v-else-if="voicewakeConfig">
          <div class="status-card">
            <div class="status-row">
              <span class="label">状态</span>
              <span class="badge" :class="voicewakeConfig.enabled ? 'enabled' : 'disabled'">
                {{ voicewakeConfig.enabled ? '已启用' : '已禁用' }}
              </span>
              <button @click="toggleVoicewake" class="toggle-btn">
                {{ voicewakeConfig.enabled ? '禁用' : '启用' }}
              </button>
            </div>
            <div class="status-row">
              <span class="label">唤醒词</span>
              <span class="value">
                <span v-if="voicewakeConfig.triggerWords?.length">
                  <code v-for="w in voicewakeConfig.triggerWords" :key="w" class="word-tag">{{ w }}</code>
                </span>
                <span v-else>-</span>
              </span>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.voice-page { padding: 24px; max-width: 1200px; }
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

.loading { text-align: center; padding: 60px 20px; color: #888; }

.status-card {
  background: #1a1a2e; padding: 24px; border-radius: 12px; border: 1px solid #2a2a4e;
}
.status-row {
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
  border-bottom: 1px solid #2a2a4e;
}
.status-row:last-child { border-bottom: none; }
.status-row .label { color: #888; font-size: 14px; min-width: 100px; }
.status-row .value { color: #e0e0e0; font-size: 14px; }

.badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.badge.enabled { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
.badge.disabled { background: rgba(107, 114, 128, 0.2); color: #9ca3af; }

.toggle-btn { margin-left: auto; padding: 6px 14px; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; background: #4a4a8e; color: #fff; }
.action-btn { margin-top: 16px; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; background: #4a4a8e; color: #fff; }

.edit-panel {
  background: #0f0f1a; margin-top: 16px; padding: 24px; border-radius: 12px; border: 1px solid #2a2a4e;
}
.edit-panel h4 { margin: 0 0 16px; color: #fff; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 8px; color: #a0a0c0; font-size: 14px; }
.form-group select {
  width: 100%; padding: 10px 12px; background: #1a1a2e; border: 1px solid #2a2a4e;
  border-radius: 6px; color: #fff; font-size: 14px;
}
.form-group select:focus { outline: none; border-color: #4a4a8e; }
.form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }
.cancel-btn { padding: 10px 20px; background: #2a2a4e; border: none; border-radius: 6px; color: #a0a0c0; cursor: pointer; }
.confirm-btn { padding: 10px 20px; background: #4a4a8e; border: none; border-radius: 6px; color: #fff; cursor: pointer; }

.word-tag {
  display: inline-block; margin: 2px 4px; padding: 4px 10px; background: #2a2a4e;
  border-radius: 12px; color: #60a5fa; font-size: 13px;
}
</style>
