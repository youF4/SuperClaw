<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useChatStore } from '@/stores/chat'
import { useGatewayStore } from '@/stores/gateway'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'

const sessionStore = useSessionStore()
const chatStore = useChatStore()
const gatewayStore = useGatewayStore()

const inputText = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

// 监听当前会话变化，加载消息历史
watch(
  () => sessionStore.currentSessionKey,
  async (sessionKey) => {
    if (sessionKey) {
      await chatStore.fetchHistory(sessionKey)
      scrollToBottom()
    }
  }
)

// 监听消息变化，自动滚动到底部
watch(
  () => chatStore.messages.length,
  () => {
    nextTick(() => scrollToBottom())
  }
)

onMounted(async () => {
  // 检查 Gateway 状态
  await gatewayStore.checkStatus()

  // 加载会话列表
  await sessionStore.fetchSessions()

  // 如果有会话，选择第一个
  if (sessionStore.sessions.length > 0) {
    sessionStore.selectSession(sessionStore.sessions[0].key)
  }
})

async function sendMessage() {
  if (!inputText.value.trim() || !sessionStore.currentSessionKey) return
  if (chatStore.streaming) return

  const text = inputText.value.trim()
  inputText.value = ''

  await chatStore.sendMessage(sessionStore.currentSessionKey, text)
  scrollToBottom()
}

async function abortGeneration() {
  if (sessionStore.currentSessionKey) {
    await chatStore.abort(sessionStore.currentSessionKey)
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="chat-page">
    <!-- 会话列表 -->
    <aside class="sessions">
      <div class="sessions-header">
        <h3>会话</h3>
        <button @click="sessionStore.createSession()" :disabled="sessionStore.loading">
          新建
        </button>
      </div>
      <div class="sessions-list">
        <div
          v-for="session in sessionStore.sessions"
          :key="session.key"
          class="session-item"
          :class="{ active: session.key === sessionStore.currentSessionKey }"
          @click="sessionStore.selectSession(session.key)"
        >
          <span class="session-name">{{ session.key.slice(0, 12) }}...</span>
          <span class="session-time" v-if="session.lastMessageAt">
            {{ formatTime(session.lastMessageAt) }}
          </span>
        </div>
      </div>
    </aside>

    <!-- 聊天区域 -->
    <main class="chat-main">
      <!-- Gateway 状态 -->
      <div class="gateway-status" :class="{ online: gatewayStore.running }">
        <span class="status-dot"></span>
        Gateway: {{ gatewayStore.running ? '运行中' : '已停止' }}
        <button
          v-if="!gatewayStore.running"
          @click="gatewayStore.start()"
          :disabled="gatewayStore.loading"
        >
          启动
        </button>
        <button v-else @click="gatewayStore.stop()" :disabled="gatewayStore.loading">
          停止
        </button>
      </div>

      <!-- 消息列表 -->
      <div class="messages" ref="messagesContainer">
        <div v-if="chatStore.loading" class="loading">加载中...</div>
        
        <div
          v-for="message in chatStore.messages"
          :key="message.id"
          class="message"
          :class="message.role"
        >
          <div class="message-header">
            <span class="message-role">
              {{ message.role === 'user' ? '你' : message.role === 'assistant' ? 'AI' : '系统' }}
            </span>
            <span class="message-time">{{ formatTime(message.createdAt) }}</span>
          </div>
          <div class="message-content">
            <MarkdownRenderer v-if="message.role === 'assistant'" :content="message.content" />
            <template v-else>{{ message.content }}</template>
          </div>
        </div>

        <div v-if="chatStore.streaming" class="message assistant streaming">
          <div class="message-content">正在思考...</div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <div class="input-row">
          <textarea
            v-model="inputText"
            placeholder="输入消息... (Enter 发送)"
            :disabled="!gatewayStore.running || chatStore.streaming"
            @keydown.enter.exact.prevent="sendMessage"
            rows="3"
          />
          <div class="input-actions">
            <button
              v-if="chatStore.streaming"
              @click="abortGeneration"
              class="abort-btn"
            >
              停止
            </button>
            <button
              v-else
              @click="sendMessage"
              :disabled="!inputText.trim() || !gatewayStore.running"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  height: 100%;
}

.sessions {
  width: 220px;
  background: #1a1a2e;
  border-right: 1px solid #2a2a4e;
  display: flex;
  flex-direction: column;
}

.sessions-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #2a2a4e;
}

.sessions-header h3 {
  margin: 0;
  font-size: 14px;
  color: #fff;
}

.sessions-header button {
  padding: 6px 12px;
  background: #4a4a8e;
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
}

.sessions-header button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sessions-list {
  flex: 1;
  overflow-y: auto;
}

.session-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #2a2a4e;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.session-item:hover {
  background: #2a2a4e;
}

.session-item.active {
  background: #4a4a8e;
}

.session-name {
  font-size: 13px;
  color: #fff;
}

.session-time {
  font-size: 11px;
  color: #888;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #0f0f1a;
}

.gateway-status {
  padding: 8px 16px;
  background: #1a1a2e;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ef4444;
  border-bottom: 1px solid #2a2a4e;
}

.gateway-status.online {
  color: #4ade80;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.gateway-status button {
  margin-left: auto;
  padding: 4px 12px;
  background: #2a2a4e;
  border: none;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  font-size: 11px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.loading {
  text-align: center;
  color: #888;
  padding: 20px;
}

.message {
  margin-bottom: 16px;
  max-width: 80%;
}

.message.user {
  margin-left: auto;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.message-role {
  font-size: 12px;
  font-weight: 500;
  color: #a0a0c0;
}

.message-time {
  font-size: 11px;
  color: #666;
}

.message-content {
  background: #1a1a2e;
  padding: 12px 16px;
  border-radius: 12px;
  color: #e0e0e0;
}

.message.user .message-content {
  background: #4a4a8e;
  color: #fff;
}

.message.streaming .message-content {
  opacity: 0.7;
}

.input-area {
  padding: 16px;
  background: #1a1a2e;
  border-top: 1px solid #2a2a4e;
}

.attachments-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.input-row {
  display: flex;
  gap: 12px;
}

.attach-btn {
  width: 44px;
  height: 44px;
  background: #2a2a4e;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.attach-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.attach-btn:hover:not(:disabled) {
  background: #3a3a5e;
}

.input-row textarea {
  flex: 1;
  padding: 12px;
  background: #0f0f1a;
  border: 1px solid #2a2a4e;
  border-radius: 8px;
  color: #fff;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
}

.input-row textarea:focus {
  outline: none;
  border-color: #4a4a8e;
}

.input-row textarea:disabled {
  opacity: 0.5;
}

.input-actions {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.input-actions button {
  padding: 12px 24px;
  background: #4a4a8e;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.input-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-actions .abort-btn {
  background: #ef4444;
}
</style>
