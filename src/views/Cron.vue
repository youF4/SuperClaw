<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCronStore } from '@/stores/cron'
import { useGatewayStore } from '@/stores/gateway'
import { notify } from '@/composables/useNotification'

const cronStore = useCronStore()
const gatewayStore = useGatewayStore()

const showAddDialog = ref(false)
const newJob = ref({
  name: '',
  schedule: '',
  command: '',
})

onMounted(async () => {
  await gatewayStore.checkStatus()
  if (gatewayStore.running) {
    await cronStore.fetchJobs()
  }
})

async function addJob() {
  if (!newJob.value.name || !newJob.value.schedule || !newJob.value.command) {
    notify('请填写完整信息', 'error')
    return
  }

  const success = await cronStore.addJob({
    name: newJob.value.name,
    schedule: newJob.value.schedule,
    command: newJob.value.command,
    enabled: true,
  })

  if (success) {
    showAddDialog.value = false
    newJob.value = { name: '', schedule: '', command: '' }
  }
}

async function removeJob(jobId: string) {
  if (!confirm('确定要删除这个定时任务吗？')) return
  await cronStore.removeJob(jobId)
}

async function runJob(jobId: string) {
  await cronStore.runJob(jobId)
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

// Cron 表达式示例
const cronExamples = [
  { label: '每分钟', value: '* * * * *' },
  { label: '每小时', value: '0 * * * *' },
  { label: '每天 8:00', value: '0 8 * * *' },
  { label: '每周一 9:00', value: '0 9 * * 1' },
  { label: '每月 1 日 0:00', value: '0 0 1 * *' },
]
</script>

<template>
  <div class="cron-page">
    <div class="page-header">
      <h2>定时任务</h2>
      <p>创建和管理定时执行的任务</p>
    </div>

    <!-- Gateway 状态提示 -->
    <div v-if="!gatewayStore.running" class="gateway-warning">
      <p>Gateway 未运行，无法获取定时任务</p>
      <button @click="gatewayStore.start()">启动 Gateway</button>
    </div>

    <!-- 添加按钮 -->
    <div class="actions-bar">
      <button @click="showAddDialog = true" class="add-btn">
        + 新建定时任务
      </button>
    </div>

    <!-- 任务列表 -->
    <div class="jobs-section">
      <div v-if="cronStore.loading" class="loading">加载中...</div>

      <div v-else-if="cronStore.jobs.length === 0" class="empty">
        <p>暂无定时任务</p>
        <button @click="showAddDialog = true">创建第一个任务</button>
      </div>

      <div v-else class="jobs-list">
        <div v-for="job in cronStore.jobs" :key="job.id" class="job-item">
          <div class="job-info">
            <div class="job-header">
              <h3>{{ job.name }}</h3>
              <span class="job-status" :class="{ enabled: job.enabled }">
                {{ job.enabled ? '已启用' : '已禁用' }}
              </span>
            </div>
            <div class="job-details">
              <div class="detail-item">
                <span class="label">调度表达式：</span>
                <code>{{ job.schedule }}</code>
              </div>
              <div class="detail-item">
                <span class="label">命令：</span>
                <code>{{ job.command }}</code>
              </div>
              <div class="detail-item">
                <span class="label">上次运行：</span>
                <span>{{ formatTime(job.lastRun) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">下次运行：</span>
                <span>{{ formatTime(job.nextRun) }}</span>
              </div>
            </div>
          </div>
          <div class="job-actions">
            <button @click="runJob(job.id)" class="run-btn">立即执行</button>
            <button @click="removeJob(job.id)" class="delete-btn">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加任务对话框 -->
    <div v-if="showAddDialog" class="dialog-overlay" @click.self="showAddDialog = false">
      <div class="dialog">
        <h3>新建定时任务</h3>

        <div class="form-group">
          <label>任务名称</label>
          <input v-model="newJob.name" type="text" placeholder="例如：每日提醒" />
        </div>

        <div class="form-group">
          <label>Cron 表达式</label>
          <input v-model="newJob.schedule" type="text" placeholder="* * * * *" />
          <div class="examples">
            <span
              v-for="example in cronExamples"
              :key="example.value"
              @click="newJob.schedule = example.value"
              class="example-tag"
            >
              {{ example.label }}
            </span>
          </div>
        </div>

        <div class="form-group">
          <label>执行命令</label>
          <input v-model="newJob.command" type="text" placeholder="例如：echo 'Hello'" />
        </div>

        <div class="dialog-actions">
          <button @click="showAddDialog = false" class="cancel-btn">取消</button>
          <button @click="addJob" class="confirm-btn">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cron-page {
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

.jobs-section {
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

.jobs-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.job-item {
  background: #1a1a2e;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.job-info {
  flex: 1;
}

.job-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.job-header h3 {
  margin: 0;
  font-size: 16px;
  color: #fff;
}

.job-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  background: #6b7280;
  color: #fff;
}

.job-status.enabled {
  background: #22c55e;
}

.job-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.detail-item {
  font-size: 13px;
}

.detail-item .label {
  color: #888;
}

.detail-item code {
  background: #2a2a4e;
  padding: 2px 6px;
  border-radius: 4px;
  color: #60a5fa;
  font-size: 12px;
}

.job-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.run-btn,
.delete-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.run-btn {
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

.form-group input {
  width: 100%;
  padding: 10px 12px;
  background: #0f0f1a;
  border: 1px solid #2a2a4e;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
}

.form-group input:focus {
  outline: none;
  border-color: #4a4a8e;
}

.examples {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.example-tag {
  font-size: 12px;
  padding: 4px 8px;
  background: #2a2a4e;
  border-radius: 4px;
  color: #a0a0c0;
  cursor: pointer;
}

.example-tag:hover {
  background: #4a4a8e;
  color: #fff;
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
