# SuperClaw

**OpenClaw 的中文桌面客户端（Windows 专用）**

基于 Tauri 2.0 构建，内嵌 OpenClaw Gateway 运行时，开箱即用。

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
- **构建工具**: Vite 6
- **内嵌运行时**: Node.js + OpenClaw Gateway

## 下载安装

- 从 [Releases](https://github.com/youF4/SuperClaw/releases) 页面下载最新版本的 `SuperClaw_0.2.0_x64-setup.exe`
- 运行安装包，按提示完成安装
- 启动 SuperClaw，程序会自动启动 OpenClaw Gateway

> ⚠️ 本软件仅支持 Windows x64 平台。

## 开发

### 环境要求

- Node.js 18+
- Rust 1.70+
- npm

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

构建产物位于 `src-tauri/target/release/bundle/nsis/SuperClaw_0.2.0_x64-setup.exe`。

## 项目结构

```
SuperClaw/
├── src/                    # Vue 3 + TypeScript 前端
│   ├── lib/                #   Gateway 客户端、WebSocket、配置
│   ├── stores/             #   Pinia 状态管理（9 个 store）
│   ├── views/              #   页面组件（聊天、通道、模型等）
│   ├── components/         #   UI 组件
│   └── composables/        #   可组合函数（通知、附件上传）
├── src-tauri/              # Tauri + Rust 后端
│   ├── src/
│   │   ├── main.rs         #   Tauri 入口
│   │   ├── gateway.rs      #   Gateway 进程管理
│   │   └── tray.rs         #   系统托盘
│   ├── capabilities/       #   Tauri 2 权限配置
│   └── tauri.conf.json     #   Tauri 配置
├── openclaw-dist/          # 内嵌的 OpenClaw v2026.5.6 运行时分发包
│   ├── node.exe            #   Node.js 运行时
│   ├── openclaw.mjs        #   OpenClaw 入口
│   ├── dist/               #   编译后的 OpenClaw 源码
│   └── node_modules/       #   依赖
├── build.ps1               # Windows 构建脚本
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 常见问题

**Q: Gateway 启动失败？**

确保没有其他程序占用 `22333` 端口。查看日志窗口了解详细错误信息。

**Q: 如何更新 OpenClaw 版本？**

`openclaw-dist/` 是预建分发包，更新需要重新从 OpenClaw 源码构建后替换该目录。

## 许可证

MIT

## 致谢

- [OpenClaw](https://github.com/openclaw/openclaw) — 核心 AI Agent 框架
- [Tauri](https://tauri.app/) — 跨平台桌面应用框架
- [Vue 3](https://vuejs.org/) — 前端框架
