#!/bin/bash
# SuperClaw 构建脚本
# 1. 编译 OpenClaw
# 2. 编译前端
# 3. 编译 Tauri
# 4. 打包

set -e

echo "=== SuperClaw Build Script ==="

# 1. 编译 OpenClaw
echo "[1/4] Building OpenClaw..."
cd openclaw
npm run build
cd ..

# 2. 编译前端
echo "[2/4] Building frontend..."
npm run build

# 3. 编译 Tauri
echo "[3/4] Building Tauri..."
cd src-tauri
cargo build --release
cd ..

# 4. 打包
echo "[4/4] Packaging..."
npm run tauri build

echo "=== Build Complete ==="
