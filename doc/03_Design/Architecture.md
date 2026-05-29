# System Architecture — AI智能组卷小程序

Version 1.0 | 2026-05-29

---

# 1. Architecture Overview

## 1.1 System Context

```
┌──────────────────────────────────────────────────────────┐
│                     微信小程序客户端                        │
│                   (UniApp + Vue3 + TS)                    │
└──────────┬───────────────────────────────────────────────┘
           │ HTTPS / WSS
           ▼
┌──────────────────────────────────────────────────────────┐
│                    NestJS API Gateway                     │
│              (JWT Auth / RBAC / Rate Limit)               │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ 用户模块  │ 组卷模块  │ 支付模块  │ 导出模块  │  管理模块    │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│                      Service Layer                        │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ AI服务    │ OCR服务   │ 知识库    │ 文件服务   │  支付服务    │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│                   Data Access Layer                       │
├─────────────────────┬────────────────────────────────────┤
│    PostgreSQL        │        腾讯云 COS                   │
│    (pgvector)        │        (文件存储)                   │
└─────────────────────┴────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│                    External Services                       │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│  Qwen3   │DeepSeek-V4│ PaddleOCR│ 微信支付  │ LibreOffice  │
│  (主LLM)  │ (备LLM)   │ (OCR)    │          │ (PDF转换)    │
└──────────┴──────────┴──────────┴──────────┴─────────────┘
```

## 1.2 Architecture Style

采用 **分层单体 (Modular Monolith)** 架构：

- 业务初期不需要微服务的运维复杂度
- NestJS 模块化设计保证代码边界清晰
- 未来可按模块拆分为微服务

### 模块边界

```
src/
├── modules/
│   ├── auth/            # 认证授权
│   ├── user/            # 用户管理
│   ├── paper/           # 组卷服务
│   ├── payment/         # 支付服务
│   ├── export/          # 导出服务
│   ├── order/           # 订单服务
│   ├── admin/
│   │   ├── upload/      # 文件上传
│   │   ├── ocr/         # OCR处理
│   │   ├── parsing/     # AI解析
│   │   ├── review/      # 入库审核
│   │   ├── question/    # 题库管理
│   │   └── knowledge/   # 知识点中心
│   └── ai/              # AI服务封装
├── common/              # 共享基础设施
│   ├── guards/          # JWT + RBAC Guard
│   ├── decorators/      # 自定义装饰器
│   ├── filters/         # 异常过滤器
│   ├── interceptors/    # 响应拦截器
│   └── dto/             # 共享DTO
└── config/              # 配置管理
```

---

# 2. Frontend Architecture

## 2.1 Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | UniApp (微信小程序) |
| UI | Vue3 Composition API |
| Language | TypeScript |
| State | Pinia |
| HTTP | uni.request + 封装拦截器 |
| Pay | wx.requestPayment |

## 2.2 Page Structure

```
pages/
├── index/              # 首页（组卷入口）
├── login/              # 微信授权登录
├── paper/
│   ├── config/         # 组卷条件配置
│   ├── preview/        # 试卷预览（首页免费预览）
│   └── result/         # 支付后完整展示
├── payment/            # 支付确认页
├── orders/             # 历史订单列表
│   └── detail/         # 订单详情/下载
├── profile/            # 个人中心
└── admin/              # 管理后台（仅admin可见）
    ├── dashboard/      # 题库总览
    ├── upload/         # 文件上传
    ├── review/         # 入库审核
    ├── questions/      # 题库管理
    ├── knowledge/      # 知识点中心
    └── files/          # 文件管理
```

## 2.3 Component Tree (核心页面)

```
PaperPreview.vue
├── PaperHeader          # 试卷标题、总分
├── QuestionCardList
│   └── QuestionCard     # 单题卡片 (for each question)
│       ├── QuestionType # 题型标签
│       ├── QuestionBody # 题目正文
│       └── OptionsList  # 选项列表
├── PreviewBlocker       # "支付后查看完整试卷"截断
└── PayButton            # 支付并导出按钮
```

---

# 3. Backend Architecture

## 3.1 Request Lifecycle

```
Request
  → GlobalExceptionFilter
  → AuthGuard (JWT验证)
  → RolesGuard (RBAC校验)
  → ValidationPipe (DTO校验)
  → Controller
  → Service
  → Repository (TypeORM)
  → ResponseInterceptor (统一响应格式)
Response
```

## 3.2 Module Dependency

```
auth ─────────────────────────────────────────┐
  │                                           │
  ▼                                           │
user ── paper ── payment ── export ── order   │
         │        │          │         │      │
         ▼        ▼          ▼         ▼      │
        ai     payment    export    order     │
         │        │          │                │
         └────────┼──────────┘                │
                  │                           │
    ┌─────────────┼─────────────┐             │
    ▼             ▼             ▼             │
  upload ──► ocr ──► parsing ──► review       │
    │                           │             │
    └───────────────────────────┤             │
                                ▼             │
                          question            │
                             │                │
                             ▼                │
                         knowledge ◄──────────┘
```

## 3.3 Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 架构模式 | Modular Monolith | V1.0功能有限，降低运维复杂度 |
| 语言 | TypeScript (前后端统一) | 类型安全，降低沟通成本 |
| ORM | TypeORM | NestJS生态最成熟 |
| 向量数据库 | pgvector (PostgreSQL扩展) | 无需额外部署，与业务库统一 |
| 文件存储 | 腾讯云COS | 微信小程序生态首选 |
| 异步任务 | BullMQ + Redis | OCR/AI解析为耗时任务，需队列 |
| 配置管理 | 环境变量 + config module | 12-factor app |

---

# 4. Infrastructure

## 4.1 Deployment Topology

```
┌──────────────────────────────────────────┐
│           Tencent Cloud ECS               │
│           (8核 16G / 100GB SSD)           │
│                                           │
│  ┌────────────────────────────────────┐  │
│  │         Docker Compose              │  │
│  │                                     │  │
│  │  ┌──────────┐  ┌──────────┐       │  │
│  │  │ NestJS   │  │ Python    │       │  │
│  │  │ (API)    │  │ (导出服务) │       │  │
│  │  └──────────┘  └──────────┘       │  │
│  │                                     │  │
│  │  ┌──────────┐  ┌──────────┐       │  │
│  │  │PostgreSQL│  │  Redis   │       │  │
│  │  │+pgvector │  │ (BullMQ) │       │  │
│  │  └──────────┘  └──────────┘       │  │
│  │                                     │  │
│  │  ┌──────────┐  ┌──────────┐       │  │
│  │  │PaddleOCR │  │LibreOffice│       │  │
│  │  │(容器化)   │  │          │       │  │
│  │  └──────────┘  └──────────┘       │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────┐    ┌──────────────────┐
│ 腾讯云 COS   │    │  外部 API          │
│ (文件存储)    │    │  Qwen3 / DS-V4    │
└─────────────┘    │  微信支付 API       │
                   └──────────────────┘
```

## 4.2 Docker Compose Services

```yaml
services:
  api:        # NestJS 主服务
  worker:     # BullMQ Worker (OCR + AI异步任务)
  export:     # Python 导出服务 (Flask)
  db:         # PostgreSQL 16 + pgvector
  redis:      # Redis 7 (BullMQ + 缓存)
  ocr:        # PaddleOCR 服务
```

---

# 5. Data Flow

## 5.1 组卷流程

```
教师端                  NestJS                   AI/DB
  │                       │                       │
  │──组卷条件──────────────►│                       │
  │                       │──Embedding检索────────►│ (pgvector)
  │                       │◄──候选题目─────────────│
  │                       │                       │
  │                       │──构建Prompt───────────►│ (Qwen3)
  │                       │◄──试卷生成结果─────────│
  │                       │                       │
  │                       │──保存试卷(暂存)────────►│ (PostgreSQL)
  │◄──试卷(仅题目+选项)────│                       │
  │                       │                       │
  │──支付─────────────────►│                       │
  │                       │──验证签名─────────────►│ (微信支付)
  │                       │◄──支付确认─────────────│
  │                       │                       │
  │──导出请求─────────────►│                       │
  │                       │──生成DOCX─────────────►│ (Python导出)
  │                       │──转PDF────────────────►│ (LibreOffice)
  │                       │──上传COS──────────────►│ (腾讯云COS)
  │◄──下载链接────────────│                       │
```

## 5.2 题库入库流程

```
管理员                 NestJS                  Worker                AI/DB
  │                       │                       │                    │
  │──上传文件+年级+学科────►│                       │                    │
  │                       │──存储文件至COS────────►│                    │
  │                       │──创建OCR任务──────────►│                    │
  │                       │                       │──PaddleOCR────────►│
  │                       │                       │◄──OCR文本──────────│
  │                       │                       │──AI切题───────────►│ (Qwen3)
  │                       │                       │──AI答案解析───────►│ (Qwen3)
  │                       │                       │──AI知识点─────────►│ (pgvector)
  │                       │                       │──AI难度───────────►│ (Qwen3)
  │                       │                       │──写待审核──────────►│ (PostgreSQL)
  │◄──上传进度────────────│◄──任务完成通知─────────│                    │
  │                       │                       │                    │
  │──审核(通过/拒绝)───────►│                       │                    │
  │                       │──更新状态─────────────►│ (PostgreSQL)      │
```

---

# 6. Security Architecture

## 6.1 Authentication Flow

```
小程序                    NestJS                   微信服务
  │                         │                        │
  │──wx.login()────────────►│                        │
  │◄──code─────────────────│                        │
  │                         │                        │
  │──POST /auth/login──────►│                        │
  │   { code }              │──code2session─────────►│
  │                         │◄──OpenID──────────────│
  │                         │──查/建用户─────────────│
  │                         │──签发JWT──────────────│
  │◄──{ accessToken }──────│                        │
  │                         │                        │
  │──API请求────────────────►│                        │
  │   Header: Bearer token  │──验证JWT──────────────│
  │                         │──提取Role─────────────│
  │                         │──RBAC校验─────────────│
```

## 6.2 RBAC Enforcement

系统仅两种角色：`teacher` 和 `admin`。

```
                    ┌─────────────┐
                    │  Request     │
                    └──────┬──────┘
                           ▼
                    ┌─────────────┐
                    │  @Public ?   │── Yes ──► Pass Through
                    └──────┬──────┘
                           │ No
                           ▼
                    ┌─────────────┐
                    │  JWT Guard   │── Token invalid?
                    └──────┬──────┘     │
                           ▼            │ Yes → 401
                    ┌─────────────┐     │
                    │ Roles Guard  │◄────┘
                    │(@Roles装饰器)│
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              ┌──────────┐  ┌──────────┐
              │ teacher   │  │ admin    │
              │ (默认角色) │  │ (手动指定)│
              └─────┬────┘  └─────┬────┘
                    ▼             ▼
                  Pass          Pass
                  (匹配)        (匹配+
                           继承teacher权限)
                    │             │
                    └──────┬──────┘
                           │ Role不匹配 → 403
```

---

# 7. Error Handling

## 7.1 Unified Response Format

```json
// 成功
{
  "code": 0,
  "message": "ok",
  "data": { ... }
}

// 失败
{
  "code": 40101,
  "message": "Token已过期",
  "data": null
}
```

## 7.2 Error Code Ranges

| Range | Module |
|-------|--------|
| 10000-10099 | Auth |
| 20000-20099 | Paper / AI |
| 30000-30099 | Payment |
| 40000-40099 | Export |
| 50000-50099 | Order |
| 60000-60099 | Upload / OCR / Parsing |
| 70000-70099 | Review |
| 80000-80099 | Question Bank |
| 90000-90099 | Knowledge Point |

---

# 8. Logging & Monitoring

| Concern | Solution |
|---------|----------|
| 应用日志 | NestJS Logger → stdout → Docker logs |
| AI调用追踪 | 记录每次LLM调用的prompt/tokens/latency |
| 支付审计 | 独立payment_log表，不可删除 |
| 健康检查 | GET /health (DB + Redis + COS连通性) |
| 告警 | 组卷失败率 > 5% 触发通知 |
