<script setup lang="ts">
import { ref, onMounted } from 'vue'
import gatewayApi from '@/lib/gateway'
import { useGatewayStore } from '@/stores/gateway'
import { notify } from '@/composables/useNotification'

const gatewayStore = useGatewayStore()

const providers = ref([
  { id: 'openai', name: 'OpenAI', apiKey: '', configured: false, models: ['gpt-4', 'gpt-3.5-turbo'] },
  { id: 'anthropic', name: 'Anthropic', apiKey: '', configured: false, models: ['claude-3-opus', 'claude-3-sonnet'] },
  { id: 'google', name: 'Google AI', apiKey: '', configured: false, models: ['gemini-pro', 'gemini-ultra'] },
  { id: 'moonshot', name: 'Moonshot (Kimi)', apiKey: '', configured: false, models: ['moonshot-v1-8k', 'moonshot-v1-32k'] },
  { id: 'deepseek', name: 'DeepSeek', apiKey: '', configured: false, models: ['deepseek-chat', 'deepseek-coder'] },
  { id: 'zhipu', name: '智谱 AI', apiKey: '', configured: false, models: ['glm-4', 'glm-3-turbo'] },
])

const loading = ref(false)
const selectedProvider = ref<string | null>(null)
const showApiKeyDialog = ref(false)
const editingApiKey = ref('')

onMounted(async () => {
  await gatewayStore.checkStatus()
  if (gatewayStore.running) {
    await fetchAuthStatus()
  }
})

async function fetchAuthStatus() {
  loading.value = true
  const response = await gatewayApi.models.authStatus()
  if (response.ok && response.result) {
    const status = response.result as Record<string, boolean>
    providers.value.forEach(p => {
      p.configured = status[p.id] || false
    })
  }
  loading.value = false
}

function openApiKeyDialog(providerId: string) {
  selectedProvider.value = providerId
  editingApiKey.value = ''
  showApiKeyDialog.value = true
}

async function saveApiKey() {
  if (!selectedProvider.value || !editingApiKey.value.trim()) {
    notify('请输入 API Key', 'error')
    return
  }

  // 保存 API Key 到配置
  const response = await gatewayApi.config.patch({
    providers: {
      [selectedProvider.value]: {
        apiKey: editingApiKey.value.trim(),
      },
    },
  })

  if (response.ok) {
    // 更新状态
    const provider = providers.value.find(p => p.id === selectedProvider.value)
    if (provider) {
      provider.configured = true
    }
    showApiKeyDialog.value = false
    notify('API Key 保存成功！', 'success')
  } else {
    notify('保存失败：' + (response.error || '未知错误'), 'error')
  }
}

async function testConnection(providerId: string) {
  const response = await gatewayApi.models.authStatus()
  if (response.ok && response.result) {
    const status = response.result as Record<string, boolean>
    if (status[providerId]) {
      notify('连接成功！', 'success')
    } else {
      notify('连接失败，请检查 API Key', 'error')
    }
  }
}
</script>

<template>
  <div class="models-page">
    <div class="page-header">
      <h2>模型配置</h2>
      <p>配置 AI 模型提供商和 API Key</p>
    </div>

    <!-- Gateway 状态提示 -->
    <div v-if="!gatewayStore.running" class="gateway-warning">
      <p>Gateway 未运行，无法获取模型状态</p>
      <button @click="gatewayStore.start()">启动 Gateway</button>
    </div>

    <!-- Provider 列表 -->
    <div class="providers-grid">
      <div
        v-for="provider in providers"
        :key="provider.id"
        class="provider-card"
        :class="{ configured: provider.configured }"
      >
        <div class="provider-header">
          <div class="provider-info">
            <h3>{{ provider.name }}</h3>
            <span class="provider-id">{{ provider.id }}</span>
          </div>
          <span
            class="status-badge"
            :class="provider.configured ? 'configured' : 'not-configured'"
          >
            {{ provider.configured ? '已配置' : '未配置' }}
          </span>
        </div>

        <div class="provider-models">
          <span class="models-label">支持模型：</span>
          <div class="models-list">
            <span v-for="model in provider.models.slice(0, 3)" :key="model" class="model-tag">
              {{ model }}
            </span>
            <span v-if="provider.models.length > 3" class="model-more">
              +{{ provider.models.length - 3 }} 更多
            </span>
          </div>
        </div>

        <div class="provider-actions">
          <button @click="openApiKeyDialog(provider.id)" class="configure-btn">
            {{ provider.configured ? '修改 API Key' : '配置 API Key' }}
          </button>
          <button
            v-if="provider.configured"
            @click="testConnection(provider.id)"
            class="test-btn"
          >
            测试连接
          </button>
        </div>
      </div>
    </div>

    <!-- API Key 配置对话框 -->
    <div v-if="showApiKeyDialog" class="dialog-overlay" @click.self="showApiKeyDialog = false">
      <div class="dialog">
        <h3>配置 API Key</h3>
        <p class="dialog-desc">
          为 <strong>{{ providers.find(p => p.id === selectedProvider)?.name }}</strong> 配置 API Key
        </p>

        <div class="form-group">
          <label>API Key</label>
          <input
            v-model="editingApiKey"
            type="password"
            placeholder="sk-..."
            autocomplete="off"
          />
          <p class="hint">API Key 将安全存储在本地配置文件中</p>
        </div>

        <div class="dialog-actions">
          <button @click="showApiKeyDialog = false" class="cancel-btn">取消</button>
          <button @click="saveApiKey" class="confirm-btn">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.models-page {
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

.providers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.provider-card {
  background: #1a1a2e;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #2a2a4e;
  transition: border-color 0.2s;
}

.provider-card.configured {
  border-color: #22c55e;
}

.provider-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.provider-info h3 {
  margin: 0;
  font-size: 16px;
  color: #fff;
}

.provider-id {
  font-size: 12px;
  color: #666;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.configured {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.status-badge.not-configured {
  background: rgba(107, 114, 128, 0.2);
  color: #9ca3af;
}

.provider-models {
  margin-bottom: 16px;
}

.models-label {
  font-size: 12px;
  color: #888;
  display: block;
  margin-bottom: 8px;
}

.models-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.model-tag {
  font-size: 11px;
  padding: 4px 8px;
  background: #2a2a4e;
  border-radius: 4px;
  color: #a0a0c0;
}

.model-more {
  font-size: 11px;
  padding: 4px 8px;
  color: #666;
}

.provider-actions {
  display: flex;
  gap: 8px;
}

.configure-btn,
.test-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.configure-btn {
  background: #4a4a8e;
  color: #fff;
}

.test-btn {
  background: #2a2a4e;
  color: #a0a0c0;
}

/* 对话框样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: #1a1a2e;
  padding: 24px;
  border-radius: 12px;
  width: 450px;
  max-width: 90%;
}

.dialog h3 {
  margin: 0 0 8px 0;
  color: #fff;
}

.dialog-desc {
  color: #888;
  margin: 0 0 20px 0;
  font-size: 14px;
}

.dialog-desc strong {
  color: #fff;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #a0a0c0;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 12px;
  background: #0f0f1a;
  border: 1px solid #2a2a4e;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  font-family: monospace;
}

.form-group input:focus {
  outline: none;
  border-color: #4a4a8e;
}

.hint {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #666;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn,
.confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn {
  background: #2a2a4e;
  color: #a0a0c0;
}

.confirm-btn {
  background: #4a4a8e;
  color: #fff;
}
</style>