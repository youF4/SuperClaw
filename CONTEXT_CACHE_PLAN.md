# ClawX vs SuperClaw 上下文管理对比

## 老板反馈的问题

> "ClawX 每次都需要重载上下文，经常造成无法获取对话历史"

---

## 问题分析

### 1. 什么是"上下文重载"？

**上下文重载** = 每次切换会话或刷新页面时，需要重新从服务器获取对话历史

**问题表现：**
- 切换会话时，历史消息加载慢
- 网络不稳定时，无法加载历史
- 页面刷新后，对话丢失

### 2. ClawX 的可能问题（推测）

ClawX 基于 OpenClaw，可能存在：

| 问题 | 说明 |
|------|------|
| **无本地缓存** | 消息只存在于服务器内存中 |
| **单次请求加载** | 每次切换会话都重新请求 |
| **无预加载** | 不提前加载常用会话 |
| **无增量更新** | 每次都全量拉取历史 |
| **WebSocket 断连** | 实时消息推送不稳定 |

### 3. SuperClaw 当前状态

**优点：**
- ✅ 使用 Pinia Store 管理状态
- ✅ 有 `fetchHistory` 方法
- ✅ 支持 WebSocket 实时消息

**缺点：**
- ❌ **无本地持久化** — 页面刷新后消息丢失
- ❌ **无消息缓存** — 每次切换会话都重新加载
- ❌ **无预加载** — 只在需要时加载
- ❌ **无增量更新** — 每次都全量拉取

---

## OpenCode 的解决方案

### 1. 本地持久化

OpenCode Desktop 使用 **electron-store** 持久化关键数据：

```typescript
import Store from 'electron-store'

const store = new Store({
  name: 'sessions',
  defaults: {
    sessions: {},
    messages: {}
  }
})

// 保存消息
store.set(`messages.${sessionKey}`, messages)

// 读取消息
const cached = store.get(`messages.${sessionKey}`)
```

### 2. 消息缓存策略

```
┌─────────────────┐
│  用户切换会话    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 检查本地缓存    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  有缓存    无缓存
    │         │
    ▼         ▼
 立即显示   显示骨架屏
    │         │
    │         ▼
    │      请求服务器
    │         │
    │         ▼
    │      渲染消息
    │         │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ 后台更新缓存    │
└─────────────────┘
```

### 3. 预加载策略

```typescript
// 应用启动时预加载最近会话
async function preloadRecentSessions() {
  const recentSessions = await getRecentSessions(5)
  for (const session of recentSessions) {
    // 后台静默加载
    fetchHistorySilent(session.key)
  }
}
```

### 4. 增量更新

```typescript
// 只拉取新消息
async function fetchNewMessages(sessionKey: string, lastMessageId: string) {
  const response = await api.get(`/sessions/${sessionKey}/messages?after=${lastMessageId}`)
  return response.data
}
```

---

## SuperClaw 改进方案

### Phase 1: 本地持久化（P0）

**目标：** 页面刷新后不丢失消息

**实现：**

#### 1. 安装依赖

```bash
npm install electron-store
```

#### 2. 创建持久化存储

```typescript
// src/main/store.ts
import Store from 'electron-store'

interface CacheSchema {
  sessions: Record<string, {
    key: string
    agentId?: string
    lastMessageAt?: number
    messageCount: number
  }>
  messages: Record<string, Message[]> // key: sessionKey
  lastSyncAt: Record<string, number> // key: sessionKey
}

export const cacheStore = new Store<CacheSchema>({
  name: 'cache',
  defaults: {
    sessions: {},
    messages: {},
    lastSyncAt: {}
  }
})
```

#### 3. 暴露 IPC 接口

```typescript
// src/main/ipc/cache.ts
import { ipcMain } from 'electron'
import { cacheStore } from './store'

ipcMain.handle('cache:get-messages', (_, sessionKey: string) => {
  return cacheStore.get(`messages.${sessionKey}`) || []
})

ipcMain.handle('cache:set-messages', (_, sessionKey: string, messages: Message[]) => {
  cacheStore.set(`messages.${sessionKey}`, messages)
})

ipcMain.handle('cache:append-message', (_, sessionKey: string, message: Message) => {
  const messages = cacheStore.get(`messages.${sessionKey}`) || []
  messages.push(message)
  cacheStore.set(`messages.${sessionKey}`, messages)
})
```

#### 4. 前端使用

```typescript
// src/renderer/src/stores/chat.ts
async function fetchHistory(sessionKey: string, limit = 50) {
  loading.value = true
  
  // 1. 先读取本地缓存
  const cached = await window.electron.ipcRenderer.invoke('cache:get-messages', sessionKey)
  if (cached.length > 0) {
    messages.value = cached
    loading.value = false
    
    // 2. 后台更新
    updateInBackground(sessionKey)
    return
  }
  
  // 3. 无缓存，直接请求
  const response = await gatewayApi.chat.history(sessionKey, limit)
  if (response.ok && response.result) {
    messages.value = response.result as Message[]
    // 4. 保存到缓存
    await window.electron.ipcRenderer.invoke('cache:set-messages', sessionKey, messages.value)
  }
  
  loading.value = false
}

async function updateInBackground(sessionKey: string) {
  const lastMessageId = messages.value[messages.value.length - 1]?.id
  if (!lastMessageId) return
  
  try {
    // 只拉取新消息
    const response = await gatewayApi.chat.history(sessionKey, 100, lastMessageId)
    if (response.ok && response.result) {
      const newMessages = response.result as Message[]
      if (newMessages.length > 0) {
        messages.value.push(...newMessages)
        await window.electron.ipcRenderer.invoke('cache:set-messages', sessionKey, messages.value)
      }
    }
  } catch (e) {
    // 静默失败，不影响用户体验
    console.error('后台更新失败:', e)
  }
}
```

### Phase 2: 预加载（P1）

**目标：** 应用启动时预加载最近会话

```typescript
// src/renderer/src/stores/session.ts
async function initialize() {
  await fetchSessions()
  
  // 预加载最近 3 个会话的历史
  const recentSessions = sessions.value
    .sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0))
    .slice(0, 3)
  
  for (const session of recentSessions) {
    // 后台静默加载
    chatStore.fetchHistorySilent(session.key)
  }
}
```

### Phase 3: 增量更新（P2）

**目标：** 只拉取新消息，减少网络传输

**需要 Gateway API 支持：**

```
GET /api/sessions/:key/messages?after={lastMessageId}
```

**前端实现：**

```typescript
async function fetchNewMessages(sessionKey: string) {
  const lastMessageId = messages.value[messages.value.length - 1]?.id
  if (!lastMessageId) return []
  
  const response = await gatewayApi.chat.history(sessionKey, 100, lastMessageId)
  if (response.ok && response.result) {
    const newMessages = response.result as Message[]
    messages.value.push(...newMessages)
    return newMessages
  }
  return []
}
```

### Phase 4: 实时推送增强（P3）

**目标：** WebSocket 连接更稳定

**改进点：**
1. 自动重连机制
2. 心跳检测
3. 离线消息同步

```typescript
// src/renderer/src/composables/useWebSocket.ts
class WebSocketManager {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  
  connect(url: string) {
    this.ws = new WebSocket(url)
    
    this.ws.onclose = () => {
      this.reconnectAttempts++
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.connect(url), 1000 * this.reconnectAttempts)
      }
    }
    
    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      // 同步离线消息
      this.syncOfflineMessages()
    }
  }
  
  private syncOfflineMessages() {
    // 同步断线期间的消息
  }
}
```

---

## 数据流对比

### 改进前

```
用户切换会话
    │
    ▼
显示 Loading
    │
    ▼
请求服务器
    │
    ▼
等待响应（网络延迟）
    │
    ▼
渲染消息
```

**问题：**
- 每次都等待网络
- 网络慢时体验差
- 页面刷新后丢失

### 改进后

```
用户切换会话
    │
    ▼
读取本地缓存（毫秒级）
    │
    ▼
立即显示消息
    │
    ▼
后台检查更新
    │
    ├─ 有更新 → 合并新消息
    │
    └─ 无更新 → 结束
```

**优点：**
- 秒开历史消息
- 离线可用
- 节省流量

---

## 实施优先级

| 优先级 | 功能 | 工作量 | 效果 |
|--------|------|--------|------|
| P0 | 本地持久化 | 1 天 | ⭐⭐⭐⭐⭐ |
| P1 | 预加载 | 0.5 天 | ⭐⭐⭐⭐ |
| P2 | 增量更新 | 1 天 | ⭐⭐⭐ |
| P3 | WebSocket 增强 | 2 天 | ⭐⭐⭐ |

---

## 总结

**问题根源：** ClawX 和当前 SuperClaw 都缺少本地持久化，导致：
1. 页面刷新丢失数据
2. 切换会话需要重新加载
3. 网络不稳定时无法使用

**解决方案：**
1. **electron-store** 本地缓存
2. 预加载常用会话
3. 增量更新机制
4. WebSocket 自动重连

**预期效果：**
- ✅ 秒开历史消息
- ✅ 离线可用
- ✅ 节省网络流量
- ✅ 更好的用户体验

**立即行动：** 先实现本地持久化（P0），这是最核心的改进！
