# SuperClaw 升级方案

## 目标

借鉴 OpenCode Desktop 的优点，把 SuperClaw 做得一样好用。

---

## OpenCode Desktop 的优点

### 1. 架构优点

| 优点 | 说明 |
|------|------|
| **Client/Server 架构** | Server 后台运行，Client 可远程连接 |
| **Monorepo** | 代码组织清晰，共享 UI 组件 |
| **前端框架** | SolidJS（比 Vue 更快，更轻量） |
| **自动更新** | electron-updater |
| **本地存储** | electron-store |
| **日志系统** | electron-log |
| **监控** | Sentry 集成 |

### 2. 技术栈对比

| 项目 | OpenCode Desktop | SuperClaw (当前) |
|------|------------------|------------------|
| **桌面框架** | Electron 41 | Electron 40 |
| **前端框架** | SolidJS | Vue 3 |
| **状态管理** | SolidJS Signals | Pinia |
| **构建工具** | electron-vite | electron-vite |
| **打包工具** | electron-builder | electron-builder |
| **包管理器** | Bun | npm |
| **Monorepo** | 是（Turborepo） | 否 |
| **自动更新** | ✅ electron-updater | ❌ |
| **本地存储** | electron-store | localStorage |
| **日志系统** | electron-log | console |
| **监控** | Sentry | ❌ |

### 3. 功能对比

| 功能 | OpenCode Desktop | SuperClaw |
|------|------------------|-----------|
| **聊天界面** | ✅ | ✅ |
| **会话管理** | ✅ | ✅ |
| **Markdown 渲染** | ✅ | ✅ |
| **自动更新** | ✅ | ❌ |
| **配置同步** | ✅ | ❌ |
| **插件系统** | ✅ MCP | ❌ |
| **多语言** | ✅ i18n | 部分 |
| **主题切换** | ✅ | ✅ |
| **系统托盘** | ✅ | ✅ |
| **快捷键** | ✅ | ❌ |
| **Web 版本** | ✅ | ❌ |

---

## 升级方案

### 方案 A：渐进式升级（推荐）

**优点：**
- 风险小，可以逐步改进
- 保留现有代码
- 学习成本低

**步骤：**

#### Phase 1: 补齐基础功能（1-2 周）

1. **自动更新**
   ```bash
   npm install electron-updater
   ```
   - 集成 electron-updater
   - 实现检查更新、下载、安装

2. **本地存储优化**
   ```bash
   npm install electron-store
   ```
   - 替换 localStorage
   - 加密敏感数据

3. **日志系统**
   ```bash
   npm install electron-log
   ```
   - 日志文件持久化
   - 错误上报

4. **监控集成**
   ```bash
   npm install @sentry/electron
   ```
   - 错误监控
   - 性能监控

#### Phase 2: 架构优化（2-3 周）

1. **Monorepo 改造**
   ```
   SuperClaw/
   ├── packages/
   │   ├── desktop/     # Electron 主进程
   │   ├── web/         # Web 版本（未来）
   │   ├── ui/          # 共享 UI 组件
   │   └── shared/      # 共享逻辑
   ├── package.json
   ├── turbo.json
   └── pnpm-workspace.yaml
   ```

2. **Client/Server 架构**
   - OpenClaw Gateway 作为 Server（已存在）
   - Desktop 作为 Client（已存在）
   - 增加远程连接能力

3. **配置同步**
   - 云端备份配置
   - 多设备同步

#### Phase 3: 性能优化（1-2 周）

1. **前端优化**
   - 虚拟滚动（大消息列表）
   - 懒加载
   - 代码分割

2. **Electron 优化**
   - 减少 CPU 占用
   - 减少内存占用
   - 优化启动速度

#### Phase 4: 功能增强（持续）

1. **插件系统**
   - 参考 OpenCode 的 MCP
   - 支持自定义插件

2. **多语言完善**
   - 完整中文翻译
   - 支持其他语言

3. **快捷键系统**
   - 全局快捷键
   - Command Palette

---

### 方案 B：重构（不推荐）

**完全重写，使用 SolidJS**

**优点：**
- 更快的性能
- 更现代的架构

**缺点：**
- 风险大
- 开发周期长
- 丢弃现有代码

---

## 立即可做的改进

### 1. 自动更新

**安装：**
```bash
npm install electron-updater
```

**代码：**
```typescript
// src/main/autoUpdater.ts
import { autoUpdater } from 'electron-updater'
import { dialog } from 'electron'

autoUpdater.checkForUpdatesAndNotify()

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
  dialog.showMessageBox({
    type: 'info',
    title: '更新可用',
    message: `新版本 ${releaseName} 已下载，是否立即安装？`,
    buttons: ['立即安装', '稍后安装']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall()
    }
  })
})
```

### 2. 本地存储优化

**安装：**
```bash
npm install electron-store
```

**代码：**
```typescript
// src/main/store.ts
import Store from 'electron-store'

interface StoreSchema {
  theme: 'light' | 'dark' | 'system'
  language: string
  sessions: Record<string, any>
  gateway: {
    host: string
    port: number
  }
}

const store = new Store<StoreSchema>({
  defaults: {
    theme: 'system',
    language: 'zh-CN',
    sessions: {},
    gateway: {
      host: '127.0.0.1',
      port: 18789
    }
  },
  encryptionKey: 'your-secret-key' // 加密敏感数据
})

export default store
```

### 3. 日志系统

**安装：**
```bash
npm install electron-log
```

**代码：**
```typescript
// src/main/logger.ts
import log from 'electron-log'

log.transports.file.level = 'info'
log.transports.console.level = 'debug'

// 日志文件路径
// Windows: %USERPROFILE%\AppData\Roaming\SuperClaw\logs\
// macOS: ~/Library/Logs/SuperClaw/
// Linux: ~/.config/SuperClaw/logs/

export default log
```

### 4. 监控集成

**安装：**
```bash
npm install @sentry/electron
```

**代码：**
```typescript
// src/main/sentry.ts
import * as Sentry from '@sentry/electron'

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: process.env.NODE_ENV
})
```

---

## 预期效果

### 短期（1 个月）

- ✅ 自动更新功能
- ✅ 更可靠的本地存储
- ✅ 完善的日志系统
- ✅ 错误监控

### 中期（2-3 个月）

- ✅ Monorepo 架构
- ✅ Web 版本基础
- ✅ 配置同步
- ✅ 性能优化

### 长期（持续）

- ✅ 插件系统
- ✅ 多语言完善
- ✅ 快捷键系统
- ✅ Command Palette

---

## 开发优先级

| 优先级 | 功能 | 工作量 | 价值 |
|--------|------|--------|------|
| P0 | 自动更新 | 2 天 | ⭐⭐⭐⭐⭐ |
| P0 | 本地存储优化 | 1 天 | ⭐⭐⭐⭐ |
| P0 | 日志系统 | 1 天 | ⭐⭐⭐⭐ |
| P1 | 错误监控 | 1 天 | ⭐⭐⭐ |
| P1 | 配置同步 | 3 天 | ⭐⭐⭐⭐ |
| P2 | Monorepo 改造 | 5 天 | ⭐⭐⭐ |
| P2 | Web 版本 | 7 天 | ⭐⭐⭐ |
| P3 | 插件系统 | 14 天 | ⭐⭐⭐⭐ |
| P3 | 快捷键系统 | 3 天 | ⭐⭐⭐ |

---

## 技术选型建议

### 是否切换到 SolidJS？

**不建议。**

**原因：**
1. Vue 3 已经足够快
2. 现有代码可复用
3. 学习成本低
4. 社区更大

**但可以借鉴：**
1. SolidJS 的响应式思想
2. 更细粒度的组件拆分

### 是否使用 Bun？

**可选。**

**优点：**
- 更快的安装速度
- 更快的启动速度
- 兼容 npm 生态

**缺点：**
- Windows 支持不够成熟
- 部分包兼容性问题

**建议：**
- 开发环境可以用 Bun
- 生产环境继续用 npm

### 是否使用 Turborepo？

**建议使用。**

**优点：**
- 更快的构建速度
- 更好的 Monorepo 管理
- 缓存优化

**步骤：**
```bash
# 安装 Turborepo
npm install turbo -D

# 创建 turbo.json
# 配置 pnpm-workspace.yaml
# 拆分 packages
```

---

## 总结

OpenCode Desktop 的核心优点：
1. **架构先进** — Client/Server + Monorepo
2. **工程完善** — 自动更新、日志、监控
3. **性能优秀** — SolidJS + 优化

SuperClaw 的改进方向：
1. **补齐基础** — 自动更新、日志、存储
2. **优化架构** — Monorepo + Client/Server
3. **持续增强** — 插件、多语言、快捷键

**目标：让 SuperClaw 成为最好用的 OpenClaw 桌面客户端！**
