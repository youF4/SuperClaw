<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAgentStore } from '@/stores/agent'
import { useGatewayStore } from '@/stores/gateway'
import { notify } from '@/composables/useNotification'
import type { Agent } from '@/stores/agent'

const agentStore = useAgentStore()
const gatewayStore = useGatewayStore()

const showAddDialog = ref(false)
const showEditDialog = ref(false)
const editingAgent = ref<Agent | null>(null)

const newAgent = ref({
  name: '',
  description: '',
  model: '',
  systemPrompt: '',
})

onMounted(async () => {
  await gatewayStore.checkStatus()
  if (gatewayStore.running) {
    await agentStore.fetchAgents()
  }
})

async function createAgent() {
  if (!newAgent.value.name) {
    notify('请输入 Agent 名称', 'error')
    return
  }

  const agent = await agentStore.createAgent({
    name: newAgent.value.name,
    description: newAgent.value.description,
    model: newAgent.value.model,
    systemPrompt: newAgent.value.systemPrompt,
  })

  if (agent) {
    showAddDialog.value = false
    resetForm()
  }
}

async function updateAgent() {
  if (!editingAgent.value) return

  const success = await agentStore.updateAgent(editingAgent.value.id, {
    name: editingAgent.value.name,
    description: editingAgent.value.description,
    model: editingAgent.value.model,
    systemPrompt: editingAgent.value.systemPrompt,
  })

  if (success) {
    showEditDialog.value = false
    editingAgent.value = null
  }
}

async function deleteAgent(agentId: string) {
  if (!confirm('确定要删除这个 Agent 吗？')) return
  await agentStore.deleteAgent(agentId)
}

function editAgent(agent: Agent) {
  editingAgent.value = { ...agent }
  showEditDialog.value = true
}

function resetForm() {
  newAgent.value = {
    name: '',
    description: '',
    model: '',
    systemPrompt: '',
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 全局 ESC 关闭对话框
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    showAddDialog.value = false
    showEditDialog.value = false
  }
}
onMounted(() => document.addEventListener('keydown', onKeyDown))
onUnmounted(() => document.removeEventListener('keydown', onKeyDown))
</script>

<template>
  <div class="agents-page">
    <div class="page-header">
      <h2>智能体管理</h2>
      <p>创建和管理多个 AI 智能体，每个智能体可以有独立的配置</p>
    </div>

    <!-- Gateway 状态提示 -->
    <div v-if="!gatewayStore.running" class="gateway-warning">
      <p>Gateway 未运行，无法获取智能体列表</p>
      <button @click="gatewayStore.start()">启动 Gateway</button>
    </div>

    <!-- 添加按钮 -->
    <div class="actions-bar">
      <button @click="showAddDialog = true" class="add-btn">
        + 新建智能体
      </button>
    </div>

    <!-- Agent 列表 -->
    <div class="agents-section">
      <div v-if="agentStore.loading" class="loading">加载中...</div>

      <div v-else-if="agentStore.agents.length === 0" class="empty">
        <p>暂无智能体</p>
        <button @click="showAddDialog = true">创建第一个智能体</button>
      </div>

      <div v-else class="agents-grid">
        <div v-for="agent in agentStore.agents" :key="agent.id" class="agent-card">
          <div class="agent-header">
            <h3>{{ agent.name }}</h3>
            <span class="agent-id">{{ agent.id.slice(0, 8) }}</span>
          </div>
          
          <p class="agent-description" v-if="agent.description">
            {{ agent.description }}
          </p>
          <p class="agent-description" v-else>
            <span class="no-desc">暂无描述</span>
          </p>

          <div class="agent-meta">
            <div class="meta-item" v-if="agent.model">
              <span class="label">模型：</span>
              <span class="value">{{ agent.model }}</span>
            </div>
            <div class="meta-item">
              <span class="label">创建时间：</span>
              <span class="value">{{ formatTime(agent.createdAt) }}</span>
            </div>
          </div>

          <div class="agent-actions">
            <button @click="editAgent(agent)" class="edit-btn">编辑</button>
            <button @click="deleteAgent(agent.id)" class="delete-btn">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建 Agent 对话框 -->
    <div v-if="showAddDialog" class="dialog-overlay" role="dialog" aria-modal="true" aria-label="新建智能体" @click.self="showAddDialog = false">
      <div class="dialog">
        <h3>新建智能体</h3>

        <div class="form-group">
          <label>名称 *</label>
          <input v-model="newAgent.name" type="text" placeholder="例如：翻译助手" />
        </div>

        <div class="form-group">
          <label>描述</label>
          <input v-model="newAgent.description" type="text" placeholder="智能体的用途说明" />
        </div>

        <div class="form-group">
          <label>模型</label>
          <input v-model="newAgent.model" type="text" placeholder="例如：gpt-4" />
        </div>

        <div class="form-group">
          <label>系统提示词</label>
          <textarea v-model="newAgent.systemPrompt" rows="4" placeholder="定义智能体的行为和角色..." />
        </div>

        <div class="dialog-actions">
          <button @click="showAddDialog = false; resetForm()" class="cancel-btn">取消</button>
          <button @click="createAgent" class="confirm-btn">创建</button>
        </div>
      </div>
    </div>

    <!-- 编辑 Agent 对话框 -->
    <div v-if="showEditDialog" class="dialog-overlay" role="dialog" aria-modal="true" aria-label="编辑智能体" @click.self="showEditDialog = false">
      <div class="dialog">
        <h3>编辑智能体</h3>

        <div class="form-group">
          <label>名称 *</label>
          <input v-model="editingAgent!.name" type="text" />
        </div>

        <div class="form-group">
          <label>描述</label>
          <input v-model="editingAgent!.description" type="text" />
        </div>

        <div class="form-group">
          <label>模型</label>
          <input v-model="editingAgent!.model" type="text" />
        </div>

        <div class="form-group">
          <label>系统提示词</label>
          <textarea v-model="editingAgent!.systemPrompt" rows="4" />
        </div>

        <div class="dialog-actions">
          <button @click="showEditDialog = false" class="cancel-btn">取消</button>
          <button @click="updateAgent" class="confirm-btn">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.agents-page {
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

.actions-bar {
  margin-bottom: 24px;
}

.add-btn {
  padding: 12px 24px;
  background: #4a4a8e;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.agents-section {
  min-height: 400px;
}

.loading,
.empty {
  text-align: center;
  padding: 60px 20px;
  color: #888;
}

.empty button {
  margin-top: 16px;
  padding: 10px 20px;
  background: #4a4a8e;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
}

.agents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.agent-card {
  background: #1a1a2e;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #2a2a4e;
}

.agent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.agent-header h3 {
  margin: 0;
  font-size: 16px;
  color: #fff;
}

.agent-id {
  font-size: 12px;
  color: #666;
  background: #2a2a4e;
  padding: 4px 8px;
  border-radius: 4px;
}

.agent-description {
  color: #a0a0c0;
  font-size: 14px;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.no-desc {
  color: #666;
}

.agent-meta {
  margin-bottom: 16px;
}

.meta-item {
  font-size: 13px;
  margin-bottom: 8px;
}

.meta-item .label {
  color: #888;
}

.meta-item .value {
  color: #e0e0e0;
}

.agent-actions {
  display: flex;
  gap: 8px;
}

.edit-btn,
.delete-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.edit-btn {
  background: #3b82f6;
  color: #fff;
}

.delete-btn {
  background: #ef4444;
  color: #fff;
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
  width: 500px;
  max-width: 90%;
}

.dialog h3 {
  margin: 0 0 20px 0;
  color: #fff;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #a0a0c0;
  font-size: 14px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  background: #0f0f1a;
  border: 1px solid #2a2a4e;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #4a4a8e;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
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