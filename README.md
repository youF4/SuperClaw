# SuperClaw

**OpenClaw 的中文桌面客户端（Windows 专用）**

基于 Tauri 2.0 构建，内嵌 OpenClaw Gateway v2026.5.6 运行时，拥有 17 个功能页面，开箱即用。

## 功能总览

| 菜单 | 功能 | API 覆盖 |
|---|---|---|
| 💬 **聊天** | 消息发送/接收、Markdown 渲染、代码高亮、会话管理 | `chat.*`, `sessions.*` |
| 📡 **通道** | Telegram、QQ、飞书、Discord 等通道状态监控 | `channels.*` |
| 🤖 **模型** | 多 Provider 支持、API Key 配置管理 | `models.*` |
| 🧠 **记忆管理** | 记忆系统状态、梦境日记、修复/去重/回填维护 | `doctor.memory.*` |
| 🔧 **工具箱** | 工具目录浏览（按分类/风险分组）、斜杠命令列表 | `tools.*`, `commands.*` |
| 🎭 **智能体** | 多智能体创建、独立配置、工作区文件管理 | `agents.*` |
| ⚡ **技能** | 技能市场、安装/卸载/更新、搜索 | `skills.*` |
| ⏰ **定时任务** | Cron 表达式、执行历史、调度管理 | `cron.*` |
| 📦 **工件管理** | 按会话浏览工件、查看元数据、安全下载 | `artifacts.*` |
| 📱 **设备管理** | 设备配对审批、令牌轮换/撤销 | `device.pair.*`, `device.token.*` |
| 🖥️ **环境节点** | Gateway 环境概览、节点列表/审批/详情/重命名 | `environments.*`, `node.*` |
| 🔊 **语音/TTS** | 文本转语音配置、语音对话模式、唤醒词管理 | `tts.*`, `talk.*`, `voicewake.*` |
| ✅ **审批中心** | 执行审批列表/批准/拒绝、插件审批、审批策略 | `exec.approval.*`, `plugin.approval.*` |
| 🔐 **密钥管理** | 密钥列表、重新加载配置 | `secrets.*` |
| 🏥 **系统诊断** | Gateway 健康状态、在线状态、网关身份信息 | `diagnostics.*`, `system-presence` |
| 🔔 **推送通知** | WebPush VAPID 密钥、订阅/取消订阅 | `push.web.*` |
| ⚙️ **设置** | 用量统计(按模型/按日)、完整配置树、实时日志、更新管理 | `config.*`, `usage.*`, `logs.*`, `update.*` |

## 技术栈

| 层 | 技术 |
|---|---|
| **桌面框架** | Tauri 2.0 (Rust) |
| **前端框架** | Vue 3 + TypeScript (Vite 6) |
| **状态管理** | Pinia (9 stores) |
| **Gateway 通信** | HTTP API (主) + WebSocket 协议 (实时事件) |
| **内嵌运行时** | Node.js + OpenClaw Gateway v2026.5.6 |
| **分发包** | NSIS 安装包 (含 WebView2 内嵌引导) |

### 架构示意

```
SuperClaw (Tauri)
├── Rust 后端
│   ├── main.rs        → 启动 Tauri、注册命令
│   ├── gateway.rs     → 管理 OpenClaw Gateway 进程
│   │                    (--port 22333 --data-dir 独立隔离)
│   └── tray.rs        → 系统托盘菜单
│
├── Vue 前端
│   ├── lib/gateway.ts     → HTTP JSON-RPC 客户端（callGateway）
│   ├── lib/websocket.ts   → WebSocket 实时事件协议（RFC 实现）
│   ├── stores/            → Pinia 状态管理
│   ├── composables/
│   │   ├── useGatewayData.ts  → 声明式 API 加载 (loading/data/error)
│   │   ├── useGatewayPage.ts  → 页面级 Gateway 状态检查
│   │   └── useRealtimeChat.ts → WebSocket 实时聊天
│   └── views/ (17 页面)
│
└── openclaw-dist/   → OpenClaw Gateway 预建运行时
```

## 下载安装

- 从 [Releases](https://github.com/youF4/SuperClaw/releases) 页面下载 `SuperClaw_0.2.0_x64-setup.exe`
- 运行安装包，按提示完成安装
- 启动 SuperClaw，程序自动启动内嵌的 OpenClaw Gateway

> ⚠️ 本软件仅支持 **Windows x64** 平台。

## 开发

### 环境要求

- Node.js 18+
- Rust 1.70+
- npm
- Visual Studio Build Tools (含 C++ 工具链，用于编译 Rust 原生依赖)
- WebView2 (Windows 10+ 自带)

### 本地构建

```bash
# 克隆项目
git clone https://github.com/youF4/SuperClaw.git
cd SuperClaw

# 安装前端依赖
npm install

# 构建安装包
npm run tauri build
```

构建产物：`src-tauri/target/release/bundle/nsis/SuperClaw_0.2.0_x64-setup.exe`

### 项目结构

```
SuperClaw/
├── src/                        # Vue 3 + TypeScript 前端
│   ├── lib/
│   │   ├── gateway.ts          #   HTTP JSON-RPC API 客户端（~85 个方法）
│   │   ├── websocket.ts        #   Gateway WebSocket 协议客户端
│   │   ├── config.ts           #   全局常量
│   │   └── types.ts            #   共享类型定义
│   ├── stores/                 #   Pinia 状态管理
│   │   ├── gateway.ts          #   Gateway 进程管理（启动/停止/状态）
│   │   ├── chat.ts             #   聊天消息
│   │   ├── session.ts          #   会话列表
│   │   ├── agent.ts            #   智能体
│   │   ├── channel.ts          #   通道
│   │   ├── provider.ts         #   模型提供商
│   │   ├── skill.ts            #   技能
│   │   ├── cron.ts             #   定时任务
│   │   └── usage.ts            #   用量统计
│   ├── views/                  # 17 个功能页面
│   ├── components/             # UI 组件
│   └── composables/
│       ├── useGatewayData.ts   #   声明式 API 数据加载 (loading/data/error)
│       ├── useGatewayPage.ts   #   页面级 Gateway 状态检查
│       ├── useRealtimeChat.ts  #   WebSocket 实时聊天订阅
│       ├── useNotification.ts  #   通知系统
│       └── useAttachments.ts   #   文件附件
├── src-tauri/                  # Tauri + Rust 后端
│   ├── src/
│   │   ├── main.rs             #   Tauri 入口
│   │   ├── gateway.rs          #   Gateway 进程管理
│   │   └── tray.rs             #   系统托盘
│   ├── capabilities/           #   Tauri 2 权限
│   └── tauri.conf.json         #   Tauri 配置
├── openclaw-dist/              # OpenClaw v2026.5.6 预建运行时
│   ├── node.exe                #   Node.js 运行时
│   ├── openclaw.mjs            #   Gateway 入口
│   ├── dist/                   #   编译后代码
│   └── node_modules/           #   依赖
├── build.ps1                   # Windows 构建脚本
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### 数据隔离

SuperClaw 使用独立的 `--data-dir` 参数启动 OpenClaw Gateway，不会与本地已有的 OpenClaw 安装冲突：

| 模式 | 数据目录 |
|---|---|
| 开发 | `<项目根>/data/openclaw/` |
| 生产 | `<exe 所在目录>/data/openclaw/` |

### 通信协议

前端通过两种方式与 OpenClaw Gateway 通信：

1. **HTTP JSON-RPC API** (`http://127.0.0.1:22333/api`)
   - 主通信方式，覆盖所有 RPC 方法
   - `callGateway()` 统一处理错误，永不 throw
   
2. **WebSocket 实时协议** (`ws://127.0.0.1:22333/ws`)
   - 基于 OpenClaw Gateway 协议（type:req/res/event 帧格式）
   - 用于实时事件推送（`session.message`、`sessions.changed` 等）
   - 自动握手 → 自动重连（指数退避）
   - 详情参考: `openclaw-dist/docs/gateway/protocol.md`

### 声明式代码风格

项目逐步采用声明式模式减少重复的命令式代码：

```typescript
// 之前（命令式）:
const devices = ref<Device[]>([])
const loading = ref(false)
async function load() {
  loading.value = true
  const res = await gatewayApi.device.pair.list()
  if (res.ok && res.result) devices.value = res.result as Device[]
  else notify('失败')
  loading.value = false
}

// 之后（声明式）:
const { data: devices, loading } = useGatewayData<Device[]>(
  () => gatewayApi.device.pair.list(),
  { onError: msg => notify(msg, 'error') }
)
```

## 常见问题

**Gateway 启动失败？**

确保没有其他程序占用 `22333` 端口。查看设置 → 日志了解详细错误信息。

**如何更新 OpenClaw 版本？**

进入设置 → 更新，点击"检查更新"并按照提示操作。

**会与本地已有的 OpenClaw 冲突吗？**

不会。SuperClaw 使用独立的 `--data-dir`，配置和会话数据完全隔离。

**WebSocket 连接失败怎么办？**

程序会自动降级为 HTTP 轮询，不影响基本功能。WebSocket 仅用于实时事件推送。

## 许可证

MIT

## 致谢

- [OpenClaw](https://github.com/openclaw/openclaw) — 核心 AI Agent 框架
- [Tauri](https://tauri.app/) — 跨平台桌面应用框架
- [Vue 3](https://vuejs.org/) — 前端框架
