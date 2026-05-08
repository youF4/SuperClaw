# SuperClaw 重构计划

## 目标

将 SuperClaw 重构为一个现代化、高性能、用户体验优秀的 OpenClaw 桌面客户端。

---

## 重构范围

### Phase 1: 核心基础设施（1-2 天）

#### 1.1 本地持久化
- [ ] 安装 electron-store
- [ ] 创建 CacheStore（消息缓存）
- [ ] 创建 ConfigStore（配置存储）
- [ ] 修改 ChatStore 使用本地缓存

#### 1.2 日志系统
- [ ] 安装 electron-log
- [ ] 配置日志文件路径
- [ ] 添加日志级别
- [ ] 前端日志同步

#### 1.3 自动更新
- [ ] 安装 electron-updater
- [ ] 配置更新服务器
- [ ] 实现检查更新逻辑
- [ ] 实现更新提示 UI

### Phase 2: 架构优化（2-3 天）

#### 2.1 目录结构调整
```
src/
├── main/                 # Electron 主进程
│   ├── index.ts         # 入口
│   ├── store.ts         # 持久化存储
│   ├── logger.ts        # 日志系统
│   ├── updater.ts       # 自动更新
│   ├── ipc/             # IPC 处理
│   │   ├── cache.ts
│   │   ├── config.ts
│   │   └── gateway.ts
│   └── tray.ts          # 系统托盘
├── preload/             # 预加载脚本
│   └── index.ts
└── renderer/            # 渲染进程
    ├── src/
    │   ├── App.vue
    │   ├── main.ts
    │   ├── components/  # UI 组件
    │   ├── views/       # 页面视图
    │   ├── stores/      # Pinia Stores
    │   ├── composables/ # 组合式函数
    │   ├── lib/         # 工具库
    │   │   ├── gateway.ts
    │   │   ├── cache.ts
    │   │   └── logger.ts
    │   └── router/
    └── index.html
```

#### 2.2 性能优化
- [ ] 虚拟滚动（大消息列表）
- [ ] 懒加载（会话列表）
- [ ] 防抖节流（搜索、输入）
- [ ] 代码分割（路由级别）

### Phase 3: 功能增强（持续）

#### 3.1 快捷键系统
- [ ] 全局快捷键注册
- [ ] Command Palette（Ctrl+K）
- [ ] 常用操作快捷键

#### 3.2 多语言完善
- [ ] 完整中文翻译
- [ ] 语言切换功能
- [ ] 语言包管理

#### 3.3 主题系统
- [ ] 亮色/暗色主题
- [ ] 自定义主题色
- [ ] 主题编辑器

---

## 立即执行：Phase 1

让我们开始 Phase 1 的重构工作。
