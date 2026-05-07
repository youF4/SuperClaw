# SuperClaw 构建脚本 (Windows)
# 1. 编译前端
# 2. 编译 Tauri + 打包

Write-Host "=== SuperClaw Build Script ===" -ForegroundColor Cyan

# 1. 编译前端
Write-Host "[1/2] Building frontend..." -ForegroundColor Yellow
npm run build

# 2. 编译 Tauri + 打包
Write-Host "[2/2] Building Tauri + packaging..." -ForegroundColor Yellow
npm run tauri build

Write-Host "=== Build Complete ===" -ForegroundColor Green
