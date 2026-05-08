# SuperClaw

**OpenClaw 的中文桌面客户端（Windows 专用）**

基于 Electron 构建，内嵌 OpenClaw Gateway 运行时，拥有 17 个功能页面，开箱即用。

## 功能总览

| 菜单 | 功能 |
|---|---|
| 💬 **聊天** | 消息发送/接收、Markdown 渲染、代码高亮、会话管理 |
| 📡 **通道** | Telegram、QQ、飞书、Discord 等通道状态监控 |
| 🤖 **模型** | 多 Provider 支持、API Key 配置管理 |
| 🧠 **记忆管理** | 记忆系统状态、梦境日记、修复/去重/回填维护 |
| 🔧 **工具箱** | 工具目录浏览（按分类/风险分组）、斜杠命令列表 |
| 🎭 **智能体** | 多智能体创建、独立配置、工作区文件管理 |
| ⚡ **技能** | 技能市场、安装/卸载/更新、搜索 |
| ⏰ **定时任务** | Cron 表达式、执行历史、调度管理 |
| 📦 **工件管理** | 按会话浏览工件、查看元数据、安全下载 |
| 📱 **设备管理** | 设备配对审批、令牌轮换/撤销 |
| 🖥️ **环境节点** | Gateway 环境概览、节点列表/审批/详情/重命名 |
| 🔊 **语音/TTS** | 文本转语音配置、语音对话模式、唤醒词管理 |
| ✅ **审批中心** | 执行审批列表/批准/拒绝、插件审批、审批策略 |
| 🔐 **密钥管理** | 密钥列表、重新加载配置 |
| 🏥 **系统诊断** | Gateway 健康状态、在线状态、网关身份信息 |
| 🔔 **推送通知** | WebPush VAPID 密钥、订阅/取消订阅 |
| ⚙️ **设置** | 用量统计(按模型/按日)、完整配置树、实时日志、更新管理 |

## 技术栈

| 层 | 技术 |
|---|---|
| **桌面框架** | Electron |
| **前端框架** | Vue 3 + TypeScript (Vite 6) |
| **状态管理** | Pinia |
| **Gateway 通信** | HTTP API (主) + WebSocket 协议 (实时事件) |
| **内嵌运行时** | Node.js + OpenClaw Gateway |
| **分发包** | NSIS 安装包 (含 WebView2 内嵌引导) |

## 下载安装

从 [Releases](https://github.com/youF4/SuperClaw/releases) 页面下载 `SuperClaw_x64-setup.exe` 并运行安装包。

## 开发

### 环境要求

- Node.js 18+
- npm

### 本地构建

```bash
git clone https://github.com/youF4/SuperClaw.git
cd SuperClaw
npm install
npm run build:win
```

构建产物：`dist/SuperClaw Setup x.x.x.exe`

## 数据隔离

SuperClaw 使用独立的 `--data-dir` 参数启动 OpenClaw Gateway，不会与本地已有的 OpenClaw 安装冲突。

## 许可证

MIT
