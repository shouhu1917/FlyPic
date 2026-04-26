# FlyPic Docker 部署指南

本项目为 [FlyPic](https://github.com/shouhu1917/FlyPic) 的 Docker 化版本，可在任何支持 Docker 的 NAS 上运行，不依赖飞牛 fnOS。

## 快速开始

### 方式一：使用 docker-compose（推荐）

1. **下载 docker-compose.yml**
   ```bash
   mkdir flypic && cd flypic
   # 下载或创建 docker-compose.yml 文件
   ```

2. **修改配置**
   编辑 `docker-compose.yml`，将 `/path/to/your/photos` 改为你的图片目录：
   ```yaml
   volumes:
     - /volume1/photos:/photos:ro  # 群晖示例
     # - /share/photos:/photos:ro  # 威联通示例
   ```

3. **启动服务**
   ```bash
   docker-compose up -d
   ```

4. **访问应用**
   打开浏览器访问：`http://你的NAS-IP:15002`

### 方式二：直接构建镜像

```bash
# 克隆本项目
git clone https://github.com/shouhu1917/FlyPic.git
cd FlyPic

# 构建镜像
docker build -t flypic:latest .

# 运行容器
docker run -d \
  --name flypic \
  -p 15002:15002 \
  -v /path/to/photos:/photos:ro \
  -v flypic-data:/data \
  --restart unless-stopped \
  flypic:latest
```

## 配置说明

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `15002` | 服务端口 |
| `NODE_ENV` | `production` | 运行模式 |
| `TZ` | `Asia/Shanghai` | 时区 |

### 卷挂载

| 容器路径 | 说明 |
|---------|------|
| `/photos` | 只读挂载你的图片素材库 |
| `/data` | 配置和数据库存储（持久化） |

## 使用流程

1. **添加素材库**
   - 访问 Web 界面
   - 点击设置 → 添加素材库
   - 输入路径：`/photos`（或你挂载的路径）

2. **扫描图片**
   - 选择素材库 → 点击扫描
   - 等待索引完成

3. **浏览和管理**
   - 搜索、筛选、查看大图
   - 所有索引数据存储在 `/data` 卷中

## 常见问题

### Q: 如何更新？

```bash
docker-compose pull
docker-compose up -d
```

### Q: 端口被占用怎么办？

修改 `docker-compose.yml` 中的端口映射：
```yaml
ports:
  - "8080:15002"  # 改为其他端口
```

### Q: 素材库路径怎么填？

Docker 容器内部路径，不是 NAS 真实路径。例如你挂载了：
```yaml
- /volume1/my-photos:/photos
```
在 FlyPic 里添加素材库时，路径填 `/photos`。

### Q: 支持哪些 NAS？

- ✅ 群晖 (Synology)
- ✅ 威联通 (QNAP)
- ✅ 华芸 (ASUSTOR)
- ✅ 铁威马 (TerraMaster)
- ✅ 自建 NAS / 服务器

只要有 Docker 就能跑！

## 鸣谢

- 原项目：[shouhu1917/FlyPic](https://github.com/shouhu1917/FlyPic)
