# ============================================================
# FlyPic - 轻量图片素材管理应用 Docker 镜像
# 适用于任何支持 Docker 的 NAS（群晖、威联通、自建等）
# 不依赖飞牛 fnOS，独立运行
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
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json

# 安装所有依赖（包含 devDependencies，用于构建前端）
RUN npm install

# 复制源代码
COPY frontend/ frontend/
COPY backend/ backend/

# 构建前端
RUN npm --workspace frontend run build

# ---- 运行阶段 ----
FROM node:22-slim

# 安装运行时原生模块编译工具（better-sqlite3, sharp 需要）
RUN apt-get update && \
    apt-get install -y python3 make g++ --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制后端 package 并安装生产依赖
COPY backend/package.json ./
RUN npm install --production && \
    npm cache clean --force

# 复制后端代码
COPY backend/server.js ./
COPY backend/src/ src/
COPY backend/database/ database/
COPY backend/utils/ utils/

# 从构建阶段复制前端产物
COPY --from=builder /build/frontend/dist ./public

# 数据目录：存放配置和数据库
RUN mkdir -p /data

# 环境变量
ENV PORT=15002
ENV FRONTEND_DIST=/app/public
ENV NODE_ENV=production

# 暴露端口
EXPOSE 15002

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "const http = require('http'); const req = http.get('http://localhost:15002/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.setTimeout(3000, () => { req.destroy(); process.exit(1); });" || exit 0

# 启动
CMD ["node", "--expose-gc", "server.js"]
