# 版本管理指南

## 版本规范

本项目遵循 [语义化版本控制 2.0.0](https://semver.org/lang/zh-CN/)

### 版本格式

```
MAJOR.MINOR.PATCH
```

- **MAJOR（主版本号）**：不兼容的 API 修改
- **MINOR（次版本号）**：向下兼容的功能性新增
- **PATCH（修订号）**：向下兼容的问题修正

---

## 版本更新流程

### 1. 更新版本号

```bash
# Bug 修复 → 0.3.0 → 0.3.1
npm version patch

# 新功能 → 0.3.1 → 0.4.0
npm version minor

# 重大变更 → 0.4.0 → 1.0.0
npm version major
```

### 2. 更新 CHANGELOG

编辑 `CHANGELOG.md`，在顶部添加新版本记录：

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- ✨ 新功能描述

### Changed
- ♻️ 修改描述

### Fixed
- 🐛 修复描述

### Removed
- 🔥 删除描述
```

### 3. 提交更改

```bash
git add .
git commit -m "chore: release v0.3.1"
```

### 4. 创建 Git Tag

```bash
git tag -a v0.3.1 -m "Release v0.3.1: 声明式重构 + 持久化"
```

### 5. 推送到 GitHub

```bash
git push origin master
git push origin v0.3.1
```

### 6. 创建 GitHub Release

访问 https://github.com/youF4/SuperClaw/releases/new

- **Tag**: v0.3.1
- **Title**: SuperClaw v0.3.1
- **Description**: 从 CHANGELOG.md 复制

---

## 一键发布脚本

### Windows (PowerShell)

```powershell
# scripts/release.ps1
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("patch", "minor", "major")]
    [string]$Type
)

# 更新版本
npm version $Type --no-git-tag-version

# 获取新版本号
$version = (Get-Content package.json | ConvertFrom-Json).version

Write-Host "新版本: v$version" -ForegroundColor Green

# 提交
git add .
git commit -m "chore: release v$version"

# 创建 Tag
git tag -a "v$version" -m "Release v$version"

# 推送
git push origin master
git push origin "v$version"

Write-Host "✅ 发布完成: v$version" -ForegroundColor Green
```

**使用：**
```powershell
.\scripts\release.ps1 -Type patch
```

---

## 版本历史

| 版本 | 日期 | 类型 | 说明 |
|------|------|------|------|
| 0.3.1 | 2026-05-08 | PATCH | 声明式重构 + 持久化 |
| 0.3.0 | 2026-05-08 | MINOR | 迁移 Electron |
| 0.2.0 | 2026-05-04 | MINOR | 核心功能 |
| 0.1.0 | 2026-05-04 | MAJOR | 项目初始化 |

---

## 自动化发布（GitHub Actions）

未来可以配置 GitHub Actions 自动发布：

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build:win
      - uses: softprops/action-gh-release@v1
        with:
          files: dist/*.exe
```

---

## 注意事项

1. **不要手动修改 package.json 的版本号**
   - 使用 `npm version` 命令

2. **每次发布都要更新 CHANGELOG.md**
   - 记录所有变更

3. **创建 Git Tag**
   - 方便回溯历史版本

4. **推送 Tag 到 GitHub**
   - 触发 GitHub Actions（如果配置）
   - 创建 GitHub Release

5. **测试后再发布**
   - 确保 `npm run build` 成功
   - 确保应用能正常启动

---

## 快速命令

```bash
# 完整发布流程
npm version patch                                    # 1. 更新版本
# 编辑 CHANGELOG.md                                  # 2. 更新日志
git add . && git commit -m "chore: release v0.3.1"  # 3. 提交
git tag -a v0.3.1 -m "Release v0.3.1"               # 4. 创建 Tag
git push origin master && git push origin v0.3.1    # 5. 推送
```
