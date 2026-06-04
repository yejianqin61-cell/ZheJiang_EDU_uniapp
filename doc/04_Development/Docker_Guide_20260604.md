# Docker 入门手册 — AI智能组卷项目实战

Version 1.0 | 2026-06-04

---

## 一、问题：为什么要有 Docker？

### 没有 Docker 的世界

```
你在 Windows 开发 → 代码在本地能跑 → 服务器是 Linux
  → 要装 Node.js 20、Python 3.11、PostgreSQL、Redis、LibreOffice
  → 版本不对？路径不对？依赖冲突？
  → 每个人部署都要重新踩坑
  → "我电脑上能跑啊" → 服务器上跑不了
```

### 有 Docker 的世界

```
你写一个 Dockerfile（像菜谱）→ Docker 照着菜谱做出一模一样的菜
  → 你的 Windows 上能跑的镜像 → 服务器上 100% 也能跑
  → 不需要在服务器上装任何东西（Node/Python/PostgreSQL 都不用装）
  → 一条命令：docker compose up -d → 全部跑起来
```

**一句话：Docker 把"环境"打包了，告别"我电脑上能跑"。**

---

## 二、三个核心概念

### 1. 镜像 (Image) = 菜谱做好的菜

```
┌─────────────────────────┐
│  镜像 = 一个只读模板     │
│  包含：                  │
│  - 操作系统 (Alpine)     │
│  - Node.js 20            │
│  - 你的代码              │
│  - 所有依赖              │
└─────────────────────────┘
```

类比：镜像就像**游戏安装包**——你下载一次，可以在任何电脑上安装。

### 2. 容器 (Container) = 运行中的菜

```
┌─────────────────────────┐
│  容器 = 镜像的运行实例   │
│  - 从镜像启动            │
│  - 有独立的文件系统      │
│  - 有独立的网络          │
│  - 可以启动/停止/删除    │
└─────────────────────────┘
```

类比：容器就像**运行中的游戏**——你双击安装好的游戏，它在内存中跑。

### 3. Docker Compose = 一键启动全家桶

```
┌─────────────────────────────┐
│  docker-compose.yml          │
│  定义了一组服务：             │
│  - backend (Node.js)         │
│  - db (PostgreSQL)           │
│  - redis (Redis)             │
│  - export (Python)           │
│  - caddy (反向代理)          │
│                              │
│  一条命令全部启动：          │
│  docker compose up -d        │
└─────────────────────────────┘
```

类比：就像**电源排插**——一个开关，电脑、显示器、音箱全开。

---

## 三、本项目的 Docker 架构

```
docker compose up -d
        │
        ├── caddy (端口 80/443)
        │     用户访问 →
        │     HTTPS 自动 →
        │     转发给 backend
        │
        ├── backend (端口 3000，内部)
        │     NestJS API
        │     PM2 多核并行
        │     ├── 读写 → db
        │     ├── 队列 → redis
        │     └── 导出请求 → export
        │
        ├── db (端口 5432，内部)
        │     PostgreSQL 15 + pgvector
        │     数据持久化到硬盘
        │
        ├── redis (端口 6379，内部)
        │     任务队列 + 缓存
        │
        └── export (端口 5000，内部)
              Python + LibreOffice
              DOCX/PDF 生成
```

### 用户请求流向

```
用户手机 → https://你的域名
              │
              ▼
         Caddy (HTTPS 终止)
              │
              ▼
         NestJS backend
         ├── 登录/组卷/支付 → 读写 PostgreSQL
         ├── 上传资料 → 任务入队 Redis → 后台异步处理
         └── 导出 DOCX → 调用 Python 服务 → 存 COS
```

---

## 四、每个文件做什么

### `backend/Dockerfile` — 后端镜像配方

```dockerfile
# 第一阶段：编译 TypeScript → JavaScript
FROM node:20-alpine AS build
COPY package*.json ./
RUN npm ci                        # 安装依赖
COPY src/ src/
RUN npm run build                 # 编译

# 第二阶段：只保留运行时需要的东西
FROM node:20-alpine
COPY --from=build /app/dist/ ./dist/
RUN npm ci --omit=dev             # 只装生产依赖（不要 devDependencies）
CMD ["pm2-runtime", "start", "ecosystem.config.js"]  # PM2 多核运行
```

**关键：两阶段构建**——编译阶段很大（有 TypeScript 编译器），但最终镜像很小（只有 JS 代码 + 运行时依赖）。

### `export-service/Dockerfile` — Python 导出镜像

```dockerfile
FROM python:3.11-slim
RUN apt-get install -y libreoffice-writer  # 安装 LibreOffice (PDF)
RUN pip install flask python-docx gunicorn # 安装 Python 依赖
COPY app.py .
CMD ["gunicorn", "-b", "0.0.0.0:5000", "-w", "2", "app:app"]
```

### `docker-compose.yml` — 全家桶编排

```yaml
services:
  db:        # PostgreSQL
    image: pgvector/pgvector:pg15
    volumes:  # 数据持久化！重启不丢数据
      - pgdata:/var/lib/postgresql/data

  redis:     # Redis
    image: redis:7-alpine

  backend:   # NestJS
    build: ./backend
    depends_on: [db, redis]  # 等数据库和 Redis 就绪
    ports: ["3000:3000"]

  caddy:     # 反向代理 + HTTPS
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
```

### `Caddyfile` — HTTPS 自动配置

```caddy
{$DOMAIN:localhost} {
    handle /v1/* {
        reverse_proxy backend:3000   # API 转发给 NestJS
    }
}
```

**Caddy 的神奇之处：** 不需要手动配 SSL 证书！Caddy 自动向 Let's Encrypt 申请免费证书，自动续期。

---

## 五、常用命令速查

```bash
# 启动所有服务（后台运行）
docker compose up -d

# 查看运行状态
docker compose ps

# 查看日志
docker compose logs -f backend    # 只看后端
docker compose logs -f            # 看全部

# 重启单个服务
docker compose restart backend

# 停止所有服务
docker compose down

# 停止并删除数据（危险！）
docker compose down -v

# 重新构建（代码改了之后）
docker compose build backend
docker compose up -d

# 进入容器内部调试
docker exec -it ai-paper-backend sh
```

---

## 六、本项目用 Docker 解决的具体问题

| 原问题 | Docker 如何解决 |
|---|---|
| 服务器要装 Node.js 20 | 镜像自带 Node.js 20 |
| 要装 Python 3.11 + LibreOffice | 镜像自带 |
| 要装 PostgreSQL + pgvector 插件 | `pgvector/pgvector:pg15` 镜像自带 |
| 要装 Redis | `redis:7-alpine` 镜像自带 |
| 环境变量管理 | `docker-compose.yml` + `.env` 统一注入 |
| Windows/Linux 路径不兼容 | 容器内统一 Linux 路径 |
| "我电脑上能跑" | 镜像一模一样，100% 可复现 |
| 要配 HTTPS | Caddy 自动申请+续期 Let's Encrypt 证书 |
| 服务挂了 | `restart: unless-stopped` 自动重启 |
| 数据丢了 | volume 持久化到宿主机硬盘 |

---

## 七、甲方问你"怎么部署"，你就这么说

> "我们的项目用 Docker 容器化部署。你只需要一台 Linux 服务器，安装 Docker，然后执行一条命令 `docker compose up -d`，5 个服务（数据库、缓存、后端、导出、HTTPS 网关）全部自动启动。HTTPS 证书自动申请，数据库自动建表。如果服务挂了会自动重启。以后代码更新只需要 `git pull && docker compose up -d --build`，30 秒完成。"

---

## 八、今晚你能装逼的一句话

> "Docker 本质上是 Linux 内核的 namespace + cgroup 隔离，不是什么虚拟机，容器和宿主机共享内核，所以启动快、占用小。一个 2C4G 的服务器跑全套服务绰绰有余。"

(别展开，说完就停)
