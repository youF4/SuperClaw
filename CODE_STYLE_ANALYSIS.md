# SuperClaw 代码风格分析报告

## 总体统计

**总文件数**: 53 个 TypeScript/Vue 文件
**总代码行数**: ~5,300 行（估算）
**总文件大小**: 251,835 字节

---

## 代码风格分类

### 1. Vue 组件（声明式为主）

**示例：Chat.vue (433 行)**

```vue
<!-- 声明式：模板部分（约占 60%） -->
<template>
  <div class="chat-page">
    <div v-for="message in messages" :key="message.id">
      <div :class="message.role">
        {{ message.content }}
      </div>
    </div>
  </div>
</template>

<!-- 命令式：脚本部分（约占 40%） -->
<script setup>
function scrollToBottom() {
  messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
}

async function sendMessage() {
  const text = inputText.value.trim()
  inputText.value = ''
  await chatStore.sendMessage(sessionKey, text)
}
</script>
```

**比例：**
- 声明式（模板、样式）：~60%
- 命令式（脚本逻辑）：~40%

---

### 2. Pinia Stores（命令式为主）

**示例：chat.ts (重构后)**

```typescript
// 声明式（约占 20%）
const messages = ref<Message[]>([])
const loading = ref(false)
const streaming = ref(false)

// 命令式（约占 80%）
async function fetchHistory(sessionKey: string) {
  loading.value = true
  
  const cached = await cache.getMessages(sessionKey)
  if (cached.length > 0) {
    messages.value = cached
    loading.value = false
    updateInBackground(sessionKey)
    return
  }
  
  const response = await gatewayApi.chat.history(sessionKey)
  messages.value = response.result
  await cache.saveMessages(sessionKey, messages.value)
  
  loading.value = false
}
```

**比例：**
- 声明式（状态声明）：~20%
- 命令式（业务逻辑）：~80%

---

### 3. 主进程代码（命令式为主）

**示例：index.ts (主进程入口)**

```typescript
// 命令式（约占 90%）
async function startGateway(): Promise<void> {
  const openclawDir = getOpenclawDir()
  const stateDir = getStateDir()
  const entryFile = join(openclawDir, 'openclaw.mjs')
  
  mkdirSync(stateDir, { recursive: true })
  
  gatewayProcess = fork(entryFile, ['gateway', ...], {
    cwd: openclawDir,
    env: { ...process.env, OPENCLAW_STATE_DIR: stateDir },
    stdio: 'pipe'
  })
  
  gatewayProcess.stdout?.on('data', (data: Buffer) => {
    console.log(`[openclaw] ${data.toString().trim()}`)
  })
}

// 声明式（约占 10%）
const GATEWAY_PORT = 22333
const isDev = !app.isPackaged
```

**比例：**
- 声明式：~10%
- 命令式：~90%

---

### 4. 工具类（声明式为主）

**示例：store.ts (缓存管理器)**

```typescript
// 声明式（约占 60%）
interface CacheSchema {
  sessions: Record<string, CachedSession>
  messages: Record<string, CachedMessage[]>
  lastSyncAt: Record<string, number>
  currentSessionKey: string | null
}

const cacheStore = new Store<CacheSchema>({
  name: 'cache',
  defaults: {
    sessions: {},
    messages: {},
    lastSyncAt: {},
    currentSessionKey: null
  }
})

// 命令式（约占 40%）
export class CacheManager {
  static getMessages(sessionKey: string): CachedMessage[] {
    return cacheStore.get(`messages.${sessionKey}`) || []
  }
  
  static saveMessages(sessionKey: string, messages: CachedMessage[]) {
    cacheStore.set(`messages.${sessionKey}`, messages)
  }
}
```

**比例：**
- 声明式（类型、配置）：~60%
- 命令式（方法实现）：~40%

---

## 按文件类型统计

| 文件类型 | 文件数 | 声明式比例 | 命令式比例 |
|---------|-------|-----------|-----------|
| **Vue 组件** | 18 | 60% | 40% |
| **Pinia Stores** | 9 | 20% | 80% |
| **主进程代码** | 8 | 10% | 90% |
| **工具类/类型** | 10 | 70% | 30% |
| **路由/配置** | 5 | 90% | 10% |
| **IPC 处理** | 3 | 30% | 70% |

---

## 总体比例

```
声明式代码：约 45%
命令式代码：约 55%
```

---

## 问题分析

### 过多命令式代码的地方

#### 1. Pinia Stores（80% 命令式）

**问题：** 业务逻辑混杂在 Store 中

```typescript
// 当前：命令式
async function fetchHistory(sessionKey: string) {
  loading.value = true
  const cached = await cache.getMessages(sessionKey)
  if (cached.length > 0) {
    messages.value = cached
    loading.value = false
    updateInBackground(sessionKey)
    return
  }
  // ...
}
```

**改进方向：** 抽离业务逻辑，使用组合式函数

```typescript
// 改进：声明式 + 组合式
function useHistory() {
  const { data, loading, error } = useAsyncData(
    () => cache.getMessages(sessionKey),
    { fallback: () => gatewayApi.chat.history(sessionKey) }
  )
  
  return { messages: data, loading, error }
}
```

#### 2. 主进程代码（90% 命令式）

**问题：** 过程式代码过多

```typescript
// 当前：命令式
async function startGateway() {
  const openclawDir = getOpenclawDir()
  const stateDir = getStateDir()
  mkdirSync(stateDir, { recursive: true })
  gatewayProcess = fork(entryFile, args, options)
}
```

**改进方向：** 使用类封装

```typescript
// 改进：声明式
class GatewayManager {
  private config = {
    openclawDir: computed(() => getOpenclawDir()),
    stateDir: computed(() => getStateDir()),
    port: 22333
  }
  
  async start() {
    this.ensureStateDir()
    await this.launchProcess()
  }
}
```

#### 3. Vue 组件脚本（40% 命令式）

**问题：** 生命周期钩子中命令式代码过多

```typescript
// 当前：命令式
onMounted(async () => {
  await gatewayStore.checkStatus()
  await sessionStore.fetchSessions()
  if (sessionStore.sessions.length > 0) {
    sessionStore.selectSession(sessionStore.sessions[0].key)
  }
})
```

**改进方向：** 使用声明式数据流

```typescript
// 改进：声明式
const { data: sessions } = useQuery('sessions', () => sessionStore.fetchSessions())
const selectedSession = computed(() => sessions.value?.[0])
```

---

## 改进建议

### 目标比例

```
声明式代码：70%
命令式代码：30%
```

### 具体措施

#### 1. 提取组合式函数

**创建 `useChatHistory.ts`：**

```typescript
// 声明式
export function useChatHistory(sessionKey: Ref<string>) {
  const { data, loading, error, mutate } = useSWR(
    computed(() => `chat-${sessionKey.value}`),
    () => Promise.all([
      cache.getMessages(sessionKey.value),
      gatewayApi.chat.history(sessionKey.value)
    ]).then(([cached, remote]) => cached.length > 0 ? cached : remote)
  )
  
  const sendMessage = useMutation((text: string) => 
    chatStore.sendMessage(sessionKey.value, text)
  )
  
  return {
    messages: data,
    loading,
    error,
    sendMessage: sendMessage.mutate
  }
}
```

#### 2. 使用配置驱动

**创建 `gateway.config.ts`：**

```typescript
// 声明式
export const gatewayConfig = {
  getOpenclawDir: (isDev: boolean) => 
    isDev ? join(app.getAppPath(), '..', 'openclaw-dist') 
         : join(process.resourcesPath, 'openclaw'),
  
  getStateDir: () => join(app.getPath('userData'), 'data', 'openclaw'),
  
  process: {
    command: 'openclaw.mjs',
    args: ['gateway', '--allow-unconfigured'],
    env: { OPENCLAW_STATE_DIR: () => getStateDir() }
  }
}
```

#### 3. 使用事件驱动

**创建 `events.ts`：**

```typescript
// 声明式
export const appEvents = defineEvents({
  gateway: {
    started: (process: ChildProcess) => ({ pid: process.pid }),
    stopped: () => void
  },
  
  chat: {
    messageReceived: (message: Message) => message,
    sessionChanged: (sessionKey: string) => sessionKey
  }
})

// 使用
appEvents.gateway.started.emit(gatewayProcess)
appEvents.chat.messageReceived.on((msg) => chatStore.addMessage(msg))
```

---

## 优先级

| 优先级 | 改进项 | 效果 |
|--------|--------|------|
| P0 | 提取组合式函数 | 减少 Store 命令式代码 50% |
| P1 | 配置驱动 | 减少主进程命令式代码 30% |
| P2 | 事件驱动 | 简化组件间通信 |
| P3 | 类型优化 | 提高类型安全性 |

---

## 结论

**当前状态：**
- 声明式：45%
- 命令式：55%

**理想状态：**
- 声明式：70%
- 命令式：30%

**核心问题：**
1. Store 中业务逻辑过重
2. 主进程过程式代码过多
3. 缺少组合式函数抽象

**下一步：**
从提取 `useChatHistory` 组合式函数开始，逐步提高声明式代码比例。
