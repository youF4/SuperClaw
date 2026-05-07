# SuperClaw 构建脚本 (Windows)
# 0. 安装 OpenClaw 依赖
# 1. 编译前端
# 2. 编译 Tauri + 打包

Write-Host "=== SuperClaw Build Script ===" -ForegroundColor Cyan

# 0. 安装 OpenClaw Gateway 的 npm 依赖（跳过脚本避免 patches 缺失报错）
Write-Host "[0/3] Installing OpenClaw dependencies..." -ForegroundColor Yellow
Set-Location -LiteralPath "openclaw-dist"
npm install --ignore-scripts
Set-Location ..

# 1. 编译前端
Write-Host "[1/3] Building frontend..." -ForegroundColor Yellow
npm run build

# 2. 编译 Tauri + 打包
Write-Host "[2/3] Building Tauri + packaging..." -ForegroundColor Yellow
npm run tauri build

Write-Host "=== Build Complete ===" -ForegroundColor Green
