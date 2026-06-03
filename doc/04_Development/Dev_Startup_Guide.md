# 本地开发启动指南

Version 1.0 | 2026-05-30

---

## 前置条件

- Node.js ≥ 20
- npm ≥ 10

## 一、后端启动

```powershell
# 1. 进入后端目录
cd backend

# 2. 安装依赖（首次或 package.json 变更后）
npm install

# 3. 启动开发服务器（watch 模式，代码改动自动重启）
npm run start:dev
```

启动后访问: `http://localhost:3000`

**零配置即可运行**：无需安装 PostgreSQL、Redis。使用 SQL.js 内存数据库，首次启动自动建表。

### 配置外部服务

编辑 `backend/.env`，填入对应 key：

```env
# LLM（阿里百炼）
QWEN3_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
QWEN3_API_KEY=sk-xxx

# Embedding（阿里百炼，与 LLM 用同一 key）
EMBEDDING_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings
EMBEDDING_API_KEY=sk-xxx

# 微信登录（不配则 code 直接当 openid）
# WX_APP_ID=
# WX_APP_SECRET=

# Redis（不配则跳过 BullMQ，同步处理）
# REDIS_HOST=

# COS 文件存储（不配则存本地）
# COS_SECRET_ID=
# COS_SECRET_KEY=
# COS_BUCKET=
# COS_REGION=
```

## 二、前端启动

```powershell
# 1. 进入前端目录
cd frontend

# 2. 安装依赖（首次或 package.json 变更后）
npm install

# 3. 编译微信小程序
npm run dev:mp-weixin
```

编译产出在 `frontend/dist/dev/mp-weixin/`。

## 三、微信开发者工具预览

1. 下载安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 打开工具 → 导入项目
3. 目录选择 `frontend/dist/dev/mp-weixin/`
4. AppID 选"测试号"
5. 模拟器预览

> **注意**：微信开发者工具中需开启"不校验合法域名"（设置 → 项目设置 → 勾选），否则无法请求 `localhost:3000`。

## 四、Python 导出服务（可选）

```powershell
# 1. 进入导出服务目录
cd export-service

# 2. 安装依赖
pip install -r requirements.txt

# 3. 启动
python app.py
```

启动后访问: `http://localhost:5000`

> 需安装 Python 3.9+。PDF 导出需额外安装 LibreOffice。

## 五、快速验证

### 登录获取 token
```powershell
curl -X POST http://localhost:3000/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"code":"test_user"}'
```

### 管理员授权（dev 模式）
启动后直接用代码中的 admin_test 登录，或手动改数据库：

```powershell
# 登录后拿到返回的 user.id，在代码中临时设为 admin
# 线上应通过数据库直接修改: UPDATE user SET role='admin' WHERE id='<user_id>';
```

### 完整流程测试

```powershell
# 1. 登录
$token = (curl -X POST http://localhost:3000/v1/auth/login -H "Content-Type: application/json" -d '{"code":"admin_test"}' | ConvertFrom-Json).data.accessToken

# 2. 组卷
curl http://localhost:3000/v1/papers/generate -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d '{"subject":"数学","grade":"五年级","difficulty":"mixed","questionCount":5}'

# 3. 查看配置选项
curl http://localhost:3000/v1/papers/config-options -H "Authorization: Bearer $token"
```

## 六、同时启动前后端

开两个终端：

| 终端 | 命令 |
|------|------|
| 终端 1 | `cd backend && npm run start:dev` |
| 终端 2 | `cd frontend && npm run dev:mp-weixin` |
