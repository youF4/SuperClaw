# SuperClaw 构建脚本 (Windows)
# 1. 编译 OpenClaw
# 2. 编译前端
# 3. 编译 Tauri
# 4. 打包

Write-Host "=== SuperClaw Build Script ===" -ForegroundColor Cyan

# 1. 编译 OpenClaw
Write-Host "[1/4] Building OpenClaw..." -ForegroundColor Yellow
Set-Location openclaw
npm run build
Set-Location ..

# 2. 编译前端
Write-Host "[2/4] Building frontend..." -ForegroundColor Yellow
npm run build

# 3. 编译 Tauri
Write-Host "[3/4] Building Tauri..." -ForegroundColor Yellow
Set-Location src-tauri
cargo build --release
Set-Location ..

# 4. 打包
Write-Host "[4/4] Packaging..." -ForegroundColor Yellow
npm run tauri build

Write-Host "=== Build Complete ===" -ForegroundColor Green
