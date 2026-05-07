# SuperClaw

**OpenClaw 的中文桌面客户端，功能比 ClawX 更完整。**

## 功能特性

### 核心功能
- 💬 **聊天界面** — 消息发送/接收、Markdown 渲染、代码高亮
- 📝 **会话管理** — 创建/切换/删除/压缩/重置会话
- 📡 **通道配置** — 支持 Telegram、QQ、飞书、Discord 等所有通道
- 🤖 **模型配置** — 多 Provider 支持、API Key 管理
- ⚡ **技能管理** — 技能市场、安装/卸载/更新
- ⏰ **定时任务** — Cron 表达式、执行历史

### 高级功能
- 🎭 **Agents 管理** — 多智能体创建、独立配置
- 📊 **用量统计** — Token 用量、费用监控
- 📋 **配置管理** — 完整配置树、导入/导出
- 📜 **日志查看** — 实时日志、过滤搜索

## 技术栈

- **桌面框架**: Tauri 2.0
- **后端语言**: Rust
- **前端框架**: Vue 3 + TypeScript
- **状态管理**: Pinia
- **构建工具**: Vite

## 安装

### Windows

下载 `SuperClaw_0.1.0_x64-setup.exe` 并运行。

### macOS

下载 `SuperClaw_0.1.0_x64.dmg` 并安装。

### Linux

下载 `SuperClaw_0.1.0_amd64.AppImage` 并运行。

## 开发

### 环境要求

- Node.js 18+
- Rust 1.70+
- pnpm / npm

### 本地开发

```bash
# 克隆项目
git clone https://github.com/your-repo/SuperClaw.git
cd SuperClaw

# 安装依赖
npm install

# 开发模式
npm run tauri dev

# 构建
npm run tauri build
```

## 项目结构

```
SuperClaw/
├── src-tauri/          # Rust 后端
│   ├── src/
│   │   ├── main.rs     # Tauri 入口
│   │   ├── gateway.rs  # Gateway 进程管理
│   │   └── tray.rs     # 系统托盘
│   └── Cargo.toml
├── src/                # Vue 前端
│   ├── lib/
│   │   ├── gateway.ts  # HTTP API 客户端
│   │   └── websocket.ts # WebSocket 客户端
│   ├── stores/         # Pinia 状态管理
│   ├── views/          # 页面组件
│   └── components/     # UI 组件
├── openclaw-dist/      # 内嵌的 OpenClaw
└── package.json
```

## 与 ClawX 的对比

| 功能 | ClawX | SuperClaw |
|------|-------|-----------|
| 语言 | 英文为主 | 原生中文 |
| 框架 | Electron | Tauri |
| 安装包大小 | ~150MB | ~10-20MB |
| Agents 管理 | ❌ | ✅ |
| 用量统计 | ❌ | ✅ |
| 日志查看 | ❌ | ✅ |

## 许可证

MIT

## 致谢

- [OpenClaw](https://github.com/openclaw/openclaw) - 核心 AI Agent 框架
- [Tauri](https://tauri.app/) - 跨平台桌面应用框架
- [Vue 3](https://vuejs.org/) - 前端框架
