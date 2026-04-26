#!/bin/bash
# ============================================================
# FlyPic Docker 入口脚本
# 支持 PUID/PGID 环境变量，适配 NAS 权限
# ============================================================

set -e

PUID=${PUID:-0}
PGID=${PGID:-0}

echo "========================================="
echo " FlyPic Docker 启动"
echo " PUID=${PUID}, PGID=${PGID}"
echo "========================================="

# 确保数据目录存在
mkdir -p /data/config
mkdir -p /data/libraries

# 如果指定了非 root 的 PUID/PGID，创建对应用户
if [ "$PUID" != "0" ] && [ "$PUID" != "" ]; then
    echo "🔧 创建用户 flypic (UID=${PUID}, GID=${PGID})..."
    
    # 创建组（如果不存在）
    if ! getent group flypic > /dev/null 2>&1; then
        groupadd -g "$PGID" flypic 2>/dev/null || groupadd flypic
    fi
    
    # 创建用户（如果不存在）
    if ! id -u flypic > /dev/null 2>&1; then
        useradd -u "$PUID" -g "$PGID" -m -s /bin/bash flypic 2>/dev/null || useradd -g flypic -m -s /bin/bash flypic
    fi
    
    # 设置数据目录权限
    chown -R flypic:flypic /data
    
    echo "✅ 以 flypic 用户启动 (UID=${PUID}, GID=${PGID})"
    exec gosu flypic node --expose-gc server.js
else
    # 以 root 运行
    echo "⚠️  以 root 用户启动（建议设置 PUID/PGID 环境变量）"
    exec node --expose-gc server.js
fi
