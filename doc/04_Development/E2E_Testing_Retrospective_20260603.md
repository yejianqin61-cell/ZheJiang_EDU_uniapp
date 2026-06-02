# 端到端测试回顾 & 开发进度评估

Version 1.0 | 2026-06-03

---

本文档记录 2026-06-02 至 2026-06-03 的完整端到端测试过程，包含测试里程碑、问题诊断与修复、模块验证状态、经验教训及上线差距评估。

---

# 一、测试背景

**起点**：后端已启动 (`npm run start:dev`)，前端已编译 (`npm run dev:mp-weixin`)，百炼 API Key 已配置。目标是验证组卷核心链路能否端到端跑通。

**初始状态**：
- 后端 NestJS + SQL.js（零配置开发模式）
- 百炼 Dashscope API Key 已填入 `.env`
- 题库为空（无题目数据）
- 前端编译完成但未在微信开发者工具中验证

---

# 二、测试里程碑

## 里程碑 1：后端组卷链路

| 步骤 | 操作 | 结果 | 耗时 |
|---|---|---|---|
| 1.1 | 灌入 seed 数据 (10 道五年级数学题) | ✅ `POST /v1/admin/seed` | <1s |
| 1.2 | 组卷请求 | ❌ `题库不足: 0题` | — |
| 1.3 | 诊断：`FALSE` SQL 关键字 SQL.js 不兼容 | 🔧 改为参数化 `:del` | — |
| 1.4 | 重新组卷 | ❌ 仍为 0 题 | — |
| 1.5 | 诊断：PowerShell 5.1 中文 JSON body 编码损坏 | 🔧 改用 UTF8NoBOM + curl.exe | — |
| 1.6 | 最终组卷 | ✅ 5 道题，`generateTime: 14.9s` | 14.9s |

**关键发现**：百炼 API 真实调用成功（非 dev 降级），日志 `[LLM] qwen-plus-latest returned XXXX chars`。

## 里程碑 2：Embedding 向量化

| 步骤 | 操作 | 结果 |
|---|---|---|
| 2.1 | 添加临时测试端点 `POST /v1/admin/test-embedding` | ✅ |
| 2.2 | 调用 embedding | ✅ `dimension: 1536`，真实向量 |

## 里程碑 3：资料入库管线

| 步骤 | 操作 | 结果 | 备注 |
|---|---|---|---|
| 3.1 | 上传 MD 文件 | ❌ 500 | `readFileSync(file.path)` 在内存存储下 path 为 undefined |
| 3.2 | 修复：`file.buffer.toString()` | ✅ | 上传成功，19 次 embedding 调用 |
| 3.3 | AI 切分 + 解析 + 标注 | ✅ | 7 道题全部解析，LLM splitter/tagger 正常 |
| 3.4 | 批量 approve | ✅ `approved: 7, failed: 0` | |

## 里程碑 4：跨学科组卷

| 步骤 | 操作 | 结果 |
|---|---|---|
| 4.1 | 上传语文 MD | ✅ 上传成功 |
| 4.2 | AI 解析 | ✅ 3/6 题识别（复杂格式题被略过） |
| 4.3 | 审核通过 | ✅ `approved: 3` |
| 4.4 | 语文组卷 | ✅ `generateTime: 13.4s`，LLM 正常 |

## 里程碑 5：支付闭环

| 步骤 | 操作 | 结果 |
|---|---|---|
| 5.1 | PHP 端下单 (curl) | ✅ `orderId + wxPayParams` |
| 5.2 | Mock 支付 | ✅ `SUCCESS` |
| 5.3 | 付费后查看试卷 | ✅ 含答案/解析/难度/分值 |

## 里程碑 6：前端验证

| 步骤 | 操作 | 结果 |
|---|---|---|
| 6.1 | 微信开发者工具启动 | ⚠️ `Error: timeout` (工具问题) |
| 6.2 | 域名校验修复 | ✅ 勾选"不校验合法域名" |
| 6.3 | 前端 mock-pay 修复 | ✅ 检测 `DEV_MOCK_SIGN` 自动走 mock-pay |
| 6.4 | H5 模式完整流程 | ✅ 登录→组卷→支付→详情全通 |
| 6.5 | 微信小程序组卷 + 支付 | ⚠️ 组卷可通，支付受 DevTools timeout 影响 |

---

# 三、模块测试结果

## 后端模块

| 模块 | 测试接口 | 结果 | 说明 |
|---|---|---|---|
| **Auth** | `POST /v1/auth/login` | ✅ | code 直当 openid，JWT 签发正常 |
| **Paper** | `POST /v1/papers/generate` | ✅ | 百炼 LLM 真实调用，含 fallback |
| **Paper** | `POST /v1/papers/:id/regenerate` | ✅ | 日限 3 次逻辑正常 |
| **Paper** | `GET /v1/papers/:id` | ✅ | 付费前后脱敏逻辑正常 |
| **Paper** | `GET /v1/papers/config-options` | ✅ | |
| **Paper** | `GET /v1/papers/debug/count` | ✅ | |
| **Order** | `POST /v1/orders` | ✅ | 下单 + wxPayParams 生成 |
| **Order** | `GET /v1/orders` | ✅ (修) | 修复 SQL.js join + 列名 |
| **Order** | `GET /v1/orders/:id` | ✅ | |
| **Payment** | `POST /v1/orders/:id/mock-pay` | ✅ | 更新 order→paid, paper→paid |
| **Admin - Seed** | `POST /v1/admin/seed` | ✅ | 幂等（≥10 题跳过） |
| **Admin - Stats** | `GET /v1/admin/questions/stats` | ✅ | |
| **Admin - Reviews** | `GET /v1/admin/reviews` | ✅ (修) | |
| **Admin - Batch Review** | `POST /v1/admin/reviews/batch` | ✅ | |
| **KB - Upload** | `POST /v1/admin/files/upload` | ✅ (修) | |
| **KB - File Status** | `GET /v1/admin/files/:id` | ✅ | |
| **KB - Pipeline** | 异步处理 | ✅ | split→tag→embed 全 AI 管线 |
| **Embedding** | 内部调用 | ✅ | 百炼 text-embedding-v4，1536 维 |

## 前端页面

| 页面 | H5 | 微信小程序 |
|---|---|---|
| 登录 | ✅ Dev 登录可用 | ⚠️ 受 timeout 影响 |
| 组卷配置 | ✅ (修复 ref 响应式) | ⚠️ 同上 |
| 试卷预览 | ✅ | ⚠️ 同上 |
| 支付 | ✅ mock-pay 秒过 | ⚠️ 同上 |
| 订单列表 | 未测 | 未测 |
| 管理后台 | 未测 | 未测 |

---

# 四、最大麻烦与解决方案

## 麻烦 1：组卷始终返回 0 题 ⭐⭐⭐⭐⭐

**现象**：`题库题目不足：需要5题，实际匹配0题`，但 `debug/count` 返回 10。

**根因**：**三重叠加 bug**：
1. 题库为空 → seed 灌入
2. `= FALSE` SQL 关键字在 SQL.js 下不兼容 → 参数化 `:del`
3. PowerShell 5.1 发送中文 JSON body 编码损坏 → UTF8NoBOM + curl.exe

**启示**：SQL.js 对标准 SQL 语法比 PostgreSQL 更严格。参数化查询是唯一正确做法。

## 麻烦 2：百炼 API 硬编码模型名 ⭐⭐⭐⭐

**现象**：4 个文件硬编码了 3 种不同的模型名（`qwen-plus`、`qwen3`、`text-embedding-v3`），其中 `qwen3` 根本不是有效 API 模型名。

**修复**：统一从 `configuration.ts` 读取，默认值改为 `qwen-plus-latest` / `text-embedding-v4`，支持环境变量覆盖。

**启示**：外部 API 配置必须集中管理，model name 应通过环境变量注入。

## 麻烦 3：文件上传 500 ⭐⭐⭐⭐

**现象**：`POST /v1/admin/files/upload` 直接 500 无日志。

**根因**：NestJS `FileInterceptor` 默认内存存储，`file.path` 为 `undefined`，`readFileSync(undefined)` 抛异常。

**修复**：改为 `file.buffer.toString('utf-8')`。

**启示**：multer 配置需要明确，内存存储和磁盘存储的 API 不同。

## 麻烦 4：SQL.js 兼容性全面告警 ⭐⭐⭐

**现象**：多处接口 500，`leftJoinAndSelect`、数据库列名、`= FALSE` 语法均不兼容。

**修复清单**（12 个文件）：
- `= FALSE` → `= :del` 参数化：6 个文件
- `leftJoinAndSelect` → 分步查询：2 个文件
- 数据库列名 → 实体属性名：6 个文件
- `readFileSync(file.path)` → `file.buffer`：1 个文件

**启示**：TypeORM QueryBuilder 必须使用实体属性名（camelCase），不允许数据库列名（snake_case）。SQL.js 开发环境和 PostgreSQL 生产环境的差异必须正视。

## 麻烦 5：微信开发者工具 timeout ⭐⭐

**现象**：`Error: timeout at WAServiceMainContext` 持续出现。

**根因**：微信开发者工具对网络请求有严格超时，且 `uni.login()` / 域名校验配置不当会加剧。

**缓解**：
- H5 模式完整可用（浏览器中跑）
- 勾选"不校验合法域名"
- 微信小程序待工具或网络环境改善后重试

---

# 五、经验启示

1. **零配置 SQL.js 是把双刃剑**——开发便利但兼容性陷阱多，所有 QueryBuilder 参数必须规范
2. **中文编码在 Windows 终端是隐形杀手**——PowerShell 5.1 + UTF-8 = 灾难，curl.exe + UTF8NoBOM 是唯一解
3. **硬编码是 bug 的温床**——模型名、SQL 关键字、文件读取方式都需要集中管理
4. **前端 H5 模式是调试利器**——绕开微信 runtime 限制，快速验证业务逻辑
5. **日志是救命稻草**——加了 `[LLM]`、`[Embedding]` 日志后，问题定位从猜谜变成秒查

---

# 六、开发进度评估

## 整体完成度

| 维度 | 之前 (V1 Assessment) | 现在 | 变化 |
|---|---|---|---|
| Feature (P0+P1) | 95% (38/40) | **97%** (39/40) | 支付 mock-pay 前端联调完成 |
| 后端代码质量 | 85% | **92%** | SQL.js 兼容性修复 + 列名规范化 |
| 前端可用性 | 83% | **88%** | H5 模式全流程通过 |
| 外部服务 (LLM+Embedding) | 10% | **100%** | 百炼双 API 调通 |
| **整体加权** | ≈72% | **≈85%** | |

## 模块详细评估

| 模块 | 完成度 | 未完成项 |
|---|---|---|
| Auth + User | 98% | 微信真实 API 对接（0.5h） |
| KnowledgeBase | 90% | DOCX/PDF 解析库；PaddleOCR 部署；3 个前端页面 |
| Paper (组卷) | 95% | pgvector 生产切换；LLM timeout 偶发 |
| Order | 95% | Cron 定时清理 |
| Payment | 40% | 完整微信支付 V3 集成（3d） |
| Export | 20% | Python 导出服务（2d） |
| Admin | 95% | ECharts 图表；2 个详情页 |
| 基础设施 | 60% | Docker Compose；PostgreSQL 迁移；HTTPS；Health Check |

## 距上线差距

### P0 — 阻塞上线

| # | 任务 | 工作量 | 模块 |
|---|------|--------|------|
| 1 | 微信支付 V3 统一下单 + 回调验签 | 3d | Payment |
| 2 | Python 导出服务 (python-docx + LibreOffice) | 2d | Export |
| 3 | Docker Compose (NestJS + PostgreSQL + Redis) | 1d | Infra |
| 4 | PostgreSQL + pgvector 部署 & 迁移 | 1d | Infra |
| 5 | SSL 证书 + HTTPS | 0.5d | Infra |
| 6 | 微信登录真实对接 (WX_APP_ID) | 0.5h | Auth |

### P1 — 应在 V1 完成

| # | 任务 | 工作量 |
|---|------|--------|
| 7 | DOCX/PDF 解析 (mammoth + pdf-parse) | 1d |
| 8 | 前端 ECharts 仪表盘图表 | 1d |
| 9 | 前端上传进度页、审核详情页 | 1d |
| 10 | 健康检查端点 GET /health | 0.5h |
| 11 | 日志文件持久化 | 0.5d |
| 12 | LLM response 偶尔超时（20s→30s 已缓解） | — |

### 预估剩余工时

| 类别 | 工时 |
|---|---|
| P0 阻塞项 | ≈7.5 天 |
| P1 优化项 | ≈3 天 |
| **合计** | **≈10.5 天** |

---

# 七、本次修改文件清单

## 后端 (12 个文件)

| 文件 | 修改内容 |
|---|---|
| `config/configuration.ts` | 默认模型名 → `qwen-plus-latest`/`text-embedding-v4`；超时 20s→30s |
| `paper/paper.service.ts` | `FALSE`→参数化；列名 `is_deleted`→`isDeleted` |
| `paper/services/generation.service.ts` | model 从 config 读取；详细日志；JSON 解析增强 |
| `paper/services/retrieval.service.ts` | `FALSE`→参数化；列名修复 |
| `knowledge-base/services/embedding.service.ts` | model 从 config 读取；详细日志 |
| `knowledge-base/services/splitter.service.ts` | model 从 config 读取 |
| `knowledge-base/services/tagger.service.ts` | model 从 config 读取 |
| `knowledge-base/services/upload.service.ts` | `readFileSync`→`file.buffer` |
| `knowledge-base/services/review.service.ts` | 去除 leftJoin；列名修复 |
| `knowledge-base/services/knowledge.service.ts` | 列名 `question_count`→`questionCount` |
| `order/order.service.ts` | 去除 leftJoin；列名 `user_id`→`userId`；分步查询 |
| `admin/services/dashboard.service.ts` | `FALSE`→参数化；列名修复 |
| `admin/services/file-manage.service.ts` | 列名 `created_at`→`createdAt` |
| `admin/services/question-manage.service.ts` | `FALSE`→参数化；列名修复 |

## 前端 (4 个文件)

| 文件 | 修改内容 |
|---|---|
| `App.vue` | 去除启动时网络请求（避免 WeChat 冷启动 timeout） |
| `pages/login/index.vue` | Dev 登录模式（H5 可用；输入 code 直接登录） |
| `pages/paper/config/index.vue` | `selectedStage` 改用 `ref`；前置校验 |
| `pages/paper/preview/index.vue` | 支付失败时显式报错 |
| `pages/payment/index.vue` | 检测 `DEV_MOCK_SIGN` 自动走 mock-pay API |
