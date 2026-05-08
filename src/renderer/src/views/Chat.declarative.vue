<!--
  Chat.vue（声明式重构）
  
  使用组合式函数，减少命令式代码
-->

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useSessionManager } from '@/composables/useSessionManager'
import { useChatHistory } from '@/composables/useChatHistory'
import { useGatewayStatus } from '@/composables/useGatewayStatus'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'

// ==================== 组合式函数 ====================

/** Gateway 状态 */
const { status: gatewayStatus, checkStatus } = useGatewayStatus()

/** 当前会话键 */
const currentSessionKey = ref<string | null>(null)

/** 会话管理 */
const {
  sessions,
  currentKey,
  currentSession,
  loading: sessionsLoading,
  createSession,
  deleteSession,
  selectSession
} = useSessionManager({
  currentKey,
  autoSelectFirst: true,
  cacheCurrent: true
})

/** 聊天历史 */
const {
  messages,
  loading: messagesLoading,
  sendMessage,
  hasMore,
  loadMore
} = useChatHistory({
  sessionKey: currentKey,
  cacheTime: 5 * 60 * 1000
})

// ==================== 局部状态 ====================

const inputText = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

// ==================== 计算属性 ====================

const loading = computed(() => sessionsLoading.value || messagesLoading.value)

const canSend = computed(() =>
  inputText.value.trim() &&
  currentKey.value &&
  !messagesLoading.value
)

// ==================== 监听器 ====================

// 滚动到底部
watch(messages, () => {
  nextTick(() => scrollToBottom())
}, { deep: true })

// ==================== 操作 ====================

function handleSend() {
  if (!canSend.value) return
  
  const text = inputText.value.trim()
  inputText.value = ''
  
  sendMessage(text)
  scrollToBottom()
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ==================== 初始化 ====================

checkStatus()
</script>

<template>
  <div class="chat-page">
    <!-- 会话列表（声明式渲染） -->
    <aside class="sessions">
      <header class="sessions-header">
        <h3>会话</h3>
        <button
          @click="createSession()"
          :disabled="sessionsLoading"
        >
          新建
        </button>
      </header>

      <div class="sessions-list">
        <div
          v-for="session in sessions"
          :key="session.key"
          class="session-item"
          :class="{ active: session.key === currentKey }"
          @click="selectSession(session.key)"
        >
          <span class="session-name">
            {{ session.key.slice(0, 12) }}...
          </span>
          <span
            v-if="session.lastMessageAt"
            class="session-time"
          >
            {{ formatTime(session.lastMessageAt) }}
          </span>
        </div>
      </div>
    </aside>

    <!-- 聊天区域（声明式渲染） -->
    <main class="chat-main">
      <!-- 消息列表 -->
      <div
        ref="messagesContainer"
        class="messages"
      >
        <div
          v-for="message in messages"
          :key="message.id"
          class="message"
          :class="message.role"
        >
          <div class="message-content">
            <MarkdownRenderer
              v-if="message.role !== 'user'"
              :content="message.content"
            />
            <template v-else>
              {{ message.content }}
            </template>
          </div>
          <div class="message-time">
            {{ formatTime(message.createdAt) }}
          </div>
        </div>

        <!-- 加载状态（声明式） -->
        <div
          v-if="messagesLoading"
          class="loading"
        >
          加载中...
        </div>

        <!-- 空状态（声明式） -->
        <div
          v-if="!messagesLoading && messages.length === 0"
          class="empty"
        >
          开始新对话
        </div>
      </div>

      <!-- 输入区域（声明式） -->
      <footer class="input-area">
        <textarea
          v-model="inputText"
          placeholder="输入消息..."
          :disabled="!currentKey"
          @keydown.enter.exact.prevent="handleSend"
        />
        <button
          @click="handleSend"
          :disabled="!canSend"
        >
          发送
        </button>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  height: 100%;
}

.sessions {
  width: 240px;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.sessions-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sessions-list {
  flex: 1;
  overflow-y: auto;
}

.session-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
}

.session-item.active {
  background: var(--active-bg);
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.message {
  margin-bottom: 1rem;
}

.message.user {
  text-align: right;
}

.message-content {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background: var(--message-bg);
}

.message.user .message-content {
  background: var(--primary-color);
  color: white;
}

.message-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.input-area {
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 0.5rem;
}

.input-area textarea {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.25rem;
  resize: none;
}

.loading,
.empty {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}
</style>
