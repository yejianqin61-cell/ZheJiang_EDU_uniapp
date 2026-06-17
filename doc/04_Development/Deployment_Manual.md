# 部署手册 — AI智能组卷系统

Version 3.0 | 2026-06-17

---

## 前置条件

- [x] 服务器（已购买）
- [x] 域名 + DNS 解析（已完成）
- [x] ICP 备案（已完成）
- [x] SSL 证书（Caddy 自动签发，无需手动）
- [ ] 阿里云短信服务（签名+模板审核通过）
- [ ] 支付宝商户号（签约电脑网站支付）

---

## 一、快速部署（5 分钟）

### 1. Clone 代码

```bash
git clone <repo-url> /opt/ai-paper
cd /opt/ai-paper
```

### 2. 配置环境变量

```bash
cp .env.production .env
nano .env  # 填入真实值（见下方说明）
```

**必填项**：

| 变量 | 说明 | 获取方式 |
|------|------|---------|
| `DOMAIN` | 网站域名 | 已有 |
| `DB_PASSWORD` | 数据库密码 | 随机生成 |
| `JWT_SECRET` | JWT 签名密钥 | `openssl rand -hex 32` |
| `ADMIN_PHONES` | 管理员手机号 | 填你自己的 |
| `QWEN3_API_KEY` | 阿里百炼 AI Key | [阿里百炼控制台](https://bailian.console.aliyun.com/) |
| `ALIBABA_ACCESS_KEY_ID` | 阿里云 AccessKey | [RAM 控制台](https://ram.console.aliyun.com/) |
| `ALIBABA_ACCESS_KEY_SECRET` | 阿里云 AccessKey Secret | 同上 |
| `SMS_SIGN_NAME` | 短信签名 | 阿里云短信控制台 → 签名管理 |
| `SMS_TEMPLATE_CODE` | 短信模板 | 阿里云短信控制台 → 模板管理 |
| `ALIPAY_APP_ID` | 支付宝应用 ID | [支付宝开放平台](https://open.alipay.com/) |
| `ALIPAY_PRIVATE_KEY` | 应用私钥 | 支付宝开放平台 → 密钥管理 |
| `ALIPAY_PUBLIC_KEY` | 支付宝公钥 | 同上 |

**选填项**（微信登录/支付，保留兼容）：

| 变量 | 说明 |
|------|------|
| `WX_APP_ID` | 微信小程序 AppID |
| `WX_APP_SECRET` | 微信小程序 AppSecret |
| `WX_MCH_ID` ~ `WX_MCH_PRIVATE_KEY` | 微信支付商户号/密钥/证书 |
| `COS_SECRET_ID` ~ `COS_REGION` | 腾讯云 COS（文件存储） |

### 3. 一键启动

```bash
docker compose up -d
```

### 4. 验证

```bash
# 后端健康检查
curl https://你的域名.com/v1/health

# 前端可访问
curl -I https://你的域名.com/

# 查看所有服务状态
docker compose ps
```

---

## 二、常用运维命令

```bash
# 查看日志
docker compose logs -f backend          # 后端日志
docker compose logs -f caddy            # 代理日志
docker compose logs --tail=100 -f       # 所有服务最近 100 行

# 重启
docker compose restart backend          # 只重启后端
docker compose up -d --force-recreate   # 重建所有容器

# 更新代码
git pull
docker compose up -d --build            # 重新构建并启动

# 数据库备份
docker exec ai-paper-db pg_dump -U ai_paper ai_paper > backup_$(date +%Y%m%d).sql

# 数据库恢复
docker exec -i ai-paper-db psql -U ai_paper ai_paper < backup_20260617.sql
```

---

## 三、服务架构

```
浏览器 (HTTPS)
    │
    ▼
Caddy (:443) ─── /v1/* ──► backend:3000 (NestJS)
    │                        │
    │                        ├── db:5432 (PostgreSQL + pgvector)
    │                        ├── redis:6379 (缓存 + 队列)
    │                        └── export:5000 (Python DOCX/PDF)
    │
    └── /* ──► frontend:80 (Nginx SPA)
```

---

## 四、阿里云短信配置

### 1. 开通短信服务
访问 [阿里云短信控制台](https://dysms.console.aliyun.com/)

### 2. 申请签名
- 签名名称：`AI智能组卷`
- 签名用途：自用
- 签名类型：网站
- 三证合一 + 网站首页截图

审核时间：1 个工作日

### 3. 申请模板
- 模板类型：验证码
- 模板名称：登录验证码
- 模板内容：`您的验证码是${code}，5分钟内有效，请勿泄露`

审核时间：1 个工作日

### 4. 获取 AccessKey
访问 [RAM 控制台](https://ram.console.aliyun.com/) → 用户 → 创建用户 → 勾选 OpenAPI 调用 → 下载 AccessKey

---

## 五、支付宝配置

### 1. 入驻支付宝商户
访问 [b.alipay.com](https://b.alipay.com) → 注册企业账户 → 提交营业执照

审核时间：1-3 个工作日

### 2. 签约电脑网站支付
登录 [支付宝开放平台](https://open.alipay.com/) → 控制台 → 产品管理 → 电脑网站支付 → 签约

### 3. 创建应用 + 密钥
1. 开放平台 → 控制台 → 应用管理 → 创建应用 → 网页/移动应用
2. 设置接口加签方式 → 生成 RSA2 密钥对 → 下载**应用私钥**，复制**支付宝公钥**
3. 将私钥和公钥填入 `.env` 的 `ALIPAY_PRIVATE_KEY` 和 `ALIPAY_PUBLIC_KEY`

---

## 六、本地开发

```bash
# 后端
cd backend
npm install
npm run start:dev    # http://localhost:3000

# 前端
cd frontend-web
npm install
npm run dev          # http://localhost:5173

# 前端 dev proxy 自动代理 /v1 → localhost:3000
# 短信验证码 dev 模式：控制台打印，不发送
# 支付宝 dev 模式：未配置密钥时返回空表单
```

---

## 七、故障排查

| 问题 | 检查 |
|------|------|
| 网站打不开 | `docker compose ps` 查看各容器状态 |
| 组卷失败 | 检查 QWEN3_API_KEY 是否有效，`docker compose logs backend` 看 AI 调用日志 |
| 短信收不到 | 检查阿里云 AccessKey + 签名模板是否审核通过 |
| 支付页面空白 | 检查 ALIPAY_APP_ID + 密钥配置 |
| 下载失败 | 检查 COS 配置 + export 容器是否运行 |
| 502 Bad Gateway | `docker compose restart backend` |
