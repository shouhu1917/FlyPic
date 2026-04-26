# ============================================================
# FlyPic - 轻量图片素材管理应用 Docker 镜像（NAS 优化版）
# 适用于任何支持 Docker 的 NAS（群晖、威联通、fnOS、自建等）
# 
# 关键优化：
# - PUID/PGID 支持，适配 NAS 用户权限
# - FLYPIC_DATA_DIR 支持，数据与素材库分离
# - FLYPIC_CONFIG_DIR 支持，配置可持久化
# - 目录浏览 API，方便容器内查找挂载路径
# ============================================================

# ---- 构建阶段 ----
FROM node:22-slim AS builder

# 安装构建原生模块所需的工具（sharp, better-sqlite3）
RUN apt-get update && \
    apt-get install -y python3 make g++ --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /build

# 先复制 package 文件，利用 Docker 缓存层
COPY package.json ./
COPY package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json

# 安装所有依赖
RUN npm ci

# 复制源代码
COPY frontend/ frontend/
COPY backend/ backend/

# 构建前端
RUN npm --workspace frontend run build

# ---- 运行阶段 ----
FROM node:22-slim

# 安装运行时原生模块编译工具 + gosu（用于 PUID/PGID 用户切换）
RUN apt-get update && \
    apt-get install -y python3 make g++ gosu --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制整个 monorepo 的 package 文件（用于 workspace 配置）
COPY package.json ./
COPY package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json

# 安装生产依赖
RUN npm ci --omit=dev && \
    npm cache clean --force

# 复制后端代码
COPY backend/server.js ./
COPY backend/src/ src/
COPY backend/database/ database/
COPY backend/utils/ utils/

# 从构建阶段复制前端产物
COPY --from=builder /build/frontend/dist ./public

# 复制入口脚本
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 数据目录结构：
# /data/config    - 全局配置（config.json）
# /data/libraries - 素材库数据（数据库、缩略图）
RUN mkdir -p /data/config /data/libraries

# 环境变量
ENV PORT=15002
ENV FRONTEND_DIST=/app/public
ENV NODE_ENV=production
# Docker 优化环境变量
ENV FLYPIC_CONFIG_DIR=/data/config
ENV FLYPIC_DATA_DIR=/data/libraries

# 暴露端口
EXPOSE 15002

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "const http = require('http'); const req = http.get('http://localhost:15002/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.setTimeout(3000, () => { req.destroy(); process.exit(1); });" || exit 0

# 入口
ENTRYPOINT ["/entrypoint.sh"]
