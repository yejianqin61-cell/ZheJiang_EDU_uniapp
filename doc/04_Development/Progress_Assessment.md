# 当前进度评估 — AI智能组卷小程序

Version 1.0 | 2026-05-30

---

本文档评估每个模块的完成情况、开发模式（dev fallback）与生产模式的差距，以及距离 V1.0 完整交付还需的工作。

## 评估维度说明

| 标记 | 含义 |
|------|------|
| ✅ Done | 功能完整，可直接使用 |
| ⚠️ Dev | 有开发 fallback，本地可跑但需接入外部服务才能上线 |
| 🔧 Stub | 骨架存在，核心逻辑未实现 |
| ❌ None | 未开始 |

---

# 1. 后端模块

## 1.1 Auth + User 模块 (User_Module)

| Feature | Status | 说明 |
|---------|--------|------|
| 微信登录 code→OpenID | ⚠️ Dev | 开发模式 code 直接当 openid；生产需配 WX_APP_ID + WX_APP_SECRET |
| JWT 签发 / Token 刷新 | ✅ Done | 24h 有效期，refresh 续期 |
| 个人信息查询 | ✅ Done | |
| 组卷统计查询 | ✅ Done | totalPapers / totalPaid / todayRegenerates |
| 管理员角色设定 | ⚠️ Dev | 需运维手动改数据库 `user.role = 'admin'`，缺少管理界面 |

**距生产差距**：微信 API 对接（1 个 HTTP 调用已封装好，配 key 即用）

---

## 1.2 KnowledgeBase 模块

| Feature | Status | 说明 |
|---------|--------|------|
| 文件上传 + 格式校验 | ✅ Done | text ≤50MB, image ≤10MB, 扩展名白名单 |
| 指定学科/年级 | ✅ Done | 上传时必填 |
| COS 文件存储 | ⚠️ Dev | 当前存 `local://` 占位；生产需配 COS_SECRET_ID + COS_SECRET_KEY |
| MD 文件内容读取 | ✅ Done | 本地 fs.readFileSync |
| DOCX/PDF 内容解析 | ❌ None | 需安装 mammoth (DOCX) + pdf-parse (PDF) |
| OCR 文字识别 | ⚠️ Dev | 文本类跳过 OCR，图片类返回不可用提示；生产需配 PADDLEOCR_URL |
| AI 题目切分 | ⚠️ Dev | 正则匹配题号 (`1.`/`(1)`/`1、`) 切分；生产用 LLM |
| AI 答案解析 (题型/答案/解析) | ⚠️ Dev | 启发式规则：选项检测→选择题，文本长度→难度；生产用 LLM |
| AI 知识点识别 | ⚠️ Dev | 学科关键词库匹配；生产用 LLM |
| AI 难度识别 | ⚠️ Dev | 文本长度估算；生产用 LLM |
| Embedding 向量生成 | ⚠️ Dev | 确定性伪随机向量，余弦相似度可用；生产用 Embedding API |
| 知识点归并 (sim≥0.92) | ✅ Done | 内存余弦相似度计算 + merge |
| 入库审核 (单题/批量) | ✅ Done | approve/reject 状态流转 |
| 知识点中心 (只读) | ✅ Done | 分页 + 学科/年级筛选 + 关键词搜索 |
| 处理管线编排 | ✅ Done | PipelineService 串联 OCR→切分→标注→知识点入库 |
| BullMQ 异步队列 | ⚠️ Dev | 有 Redis 时自动启用，无 Redis 同步调用 |

**距生产差距**：
1. 配外部服务 key（LLM / Embedding / PaddleOCR / COS）
2. 安装 DOCX/PDF 解析库（mammoth, pdf-parse）
3. 前端上传进度页尚未开发（`/pages/admin/upload/progress`）

---

## 1.3 Paper 模块

| Feature | Status | 说明 |
|---------|--------|------|
| 组卷配置选项 | ✅ Done | 学段→年级→科目→难度枚举 |
| 知识点联动列表 | ✅ Done | 按 subject+grade 过滤，questionCount 倒序 |
| DB 筛选检索 | ✅ Done | subject + grade + approved + isDeleted=false |
| 知识点关联匹配 | ✅ Done | 通过 question_knowledge 表 + embedding cosine boost |
| 难度分布重排 | ✅ Done | 混合 1:2:1，指定难度全选，分桶抽样 |
| LLM 试卷生成 | ⚠️ Dev | 配了 Qwen3 主 + DeepSeek-V4 备 + 超时 20s + 失败重试；Dev 模式直接用 DB 题目 |
| JSON 校验 | ✅ Done | 提取 JSON、题目数量校验 |
| 题目快照保存 | ✅ Done | paper + paper_question_snapshot 双写 |
| 教师端脱敏输出 | ✅ Done | stripMetadata：仅返回 index/type/content/options |
| 重新生成 (日限3次) | ✅ Done | 按 createdAt 统计今日 papers 数量 |
| 试卷详情查询 | ✅ Done | 未支付仅题目+选项，已支付含答案/解析/难度/分值 |
| pgvector 语义检索 | ⚠️ Dev | 用 EmbeddingService cosine similarity 内存计算；生产用 pgvector `<=>` 算子 |

**距生产差距**：
1. 配 LLM API key
2. pgvector 向量检索（生产 SQL 已在设计文档中，当前用 JS 内存计算替代）

---

## 1.4 Order 模块

| Feature | Status | 说明 |
|---------|--------|------|
| 创建订单 | ✅ Done | 生成业务单号，记录金额，30min 过期 |
| 订单过期处理 | ✅ Done | expired_at 字段，Cron 清理 pending |
| 历史订单列表 | ✅ Done | 按时间倒序，本人数据隔离(OpenID) |
| 按状态/科目筛选 | ✅ Done | |
| 重复下载 | ✅ Done | 校验 paid 状态 |
| 订单清理 (1天物理删除) | ❌ None | 需配置 Cron Job |

---

## 1.5 Payment 模块

| Feature | Status | 说明 |
|---------|--------|------|
| 统一下单 (微信支付) | 🔧 Stub | wxPayParams 返回 null |
| 支付回调验签 | 🔧 Stub | handleCallback 骨架存在，未实现验签+解密 |
| 支付状态查询 | ✅ Done | 查 order.status |
| 支付成功状态同步 | 🔧 Stub | callback 中需更新 order→paid, paper→paid |

**距生产差距**：完整微信支付 API V3 集成（统一下单、回调验签、证书管理）

---

## 1.6 Export 模块

| Feature | Status | 说明 |
|---------|--------|------|
| 支付状态校验 | ✅ Done | 未支付返回 402 |
| DOCX 导出 | 🔧 Stub | 调用 Python 服务骨架，实际未生成文件 |
| PDF 导出 | 🔧 Stub | LibreOffice 转换未实现 |
| COS 上传 + 签名 URL | 🔧 Stub | 返回空 downloadUrl |

**距生产差距**：
1. Python 导出服务开发（python-docx 生成 + LibreOffice 转 PDF）
2. COS SDK 对接

---

## 1.7 Admin 模块

| Feature | Status | 说明 |
|---------|--------|------|
| 题库总览统计 | ✅ Done | 总题量/学科分布/年级分布/难度分布/知识点总数 |
| 题目列表 (多维度筛选) | ✅ Done | subject/grade/difficulty/knowledgePoint/fileId/keyword |
| 题目详情 | ✅ Done | |
| 关键词搜索 | ✅ Done | LIKE 全文匹配 |
| 单题软删除 | ✅ Done | is_deleted=true |
| 批量软删除 | ✅ Done | |
| 按文件软删除 | ✅ Done | |
| 文件列表 | ✅ Done | |
| 文件删除 + 关联题目软删除 | ✅ Done | |
| 前端图表可视化 | ❌ None | 仪表盘当前仅有数字和简易进度条 |

**距生产差距**：前端图表组件（饼图/柱状图，可用 ECharts for uni-app）

---

# 2. 前端页面

## 2.1 教师端

| 页面 | 路由 | 状态 | 说明 |
|------|------|------|------|
| 首页 | `/pages/index/index` | ✅ Done | 组卷入口 + 管理员入口 |
| 登录 | `/pages/login/index` | ✅ Done | 微信一键授权 |
| 组卷配置 | `/pages/paper/config/index` | ✅ Done | 学段→年级→科目→难度→题量 |
| 试卷预览 | `/pages/paper/preview/index` | ✅ Done | 前5题 + 截断提示 |
| 支付 | `/pages/payment/index` | ✅ Done | |
| 历史订单 | `/pages/orders/index` | ✅ Done | |
| 订单详情 | `/pages/orders/detail/index` | ✅ Done | |
| 个人中心 | `/pages/profile/index` | ✅ Done | |

## 2.2 管理后台

| 页面 | 路由 | 状态 | 说明 |
|------|------|------|------|
| 仪表盘 | `/pages/admin/dashboard/index` | ✅ Done | 缺图表 |
| 上传资料 | `/pages/admin/upload/index` | ✅ Done | |
| 上传进度 | `/pages/admin/upload/progress` | ❌ None | 设计中有，未开发 |
| 入库审核 | `/pages/admin/review/index` | ✅ Done | |
| 审核详情 | `/pages/admin/review/detail` | ❌ None | 设计中有，未开发 |
| 题库管理 | `/pages/admin/questions/index` | ✅ Done | |
| 题目详情 | `/pages/admin/questions/detail` | ❌ None | 设计中有，未开发 |
| 知识点中心 | `/pages/admin/knowledge/index` | ✅ Done | |
| 文件管理 | `/pages/admin/files/index` | ✅ Done | |

---

# 3. 基础设施

| 项目 | 状态 | 说明 |
|------|------|------|
| 数据库 (SQLite dev / PostgreSQL prod) | ✅ Done | sql.js 零配置本地开发 |
| 11 张表自动建表 | ✅ Done | synchronize: true |
| JWT + RBAC 鉴权 | ✅ Done | teacher/admin 双角色 |
| 统一错误码体系 | ✅ Done | 12 个区间 |
| 统一响应格式 | ✅ Done | {code, message, data, timestamp} |
| BullMQ 异步队列 | ⚠️ Dev | 有 Redis 自动启用 |
| COS 文件存储 | ⚠️ Dev | 本地占位 |
| Docker Compose | ❌ None | 设计中有，未编写 |
| .gitignore | ✅ Done | |

---

# 4. 数据库迁移脚本

| 文件 | 状态 | 说明 |
|------|------|------|
| `001_init.sql` (PostgreSQL) | ✅ Done | 完整 DDL + pgvector 索引 |
| SQLite 初始化 | ✅ Done | TypeORM synchronize 自动建表 |

---

# 5. V1.0 完整交付检查清单

### 必须在 V1.0 上线前完成 (P0)

- [ ] **微信登录对接**：配 WX_APP_ID + WX_APP_SECRET，启用真实 code→OpenID
- [ ] **微信支付对接**：完整 API V3 集成（统一下单 + 回调验签 + 证书管理）
- [ ] **LLM API 对接**：配 Qwen3 / DeepSeek-V4 API key，启用真实 AI 组卷和题目解析
- [ ] **Embedding API 对接**：配 Embedding 服务，启用语义检索
- [ ] **PaddleOCR 对接**：配 OCR 服务地址，启用图片文字识别
- [ ] **COS 对接**：配 COS_SECRET_ID/KEY，启用真实文件存储和下载链接
- [ ] **Python 导出服务**：开发 python-docx 生成 + LibreOffice PDF 转换
- [ ] **Redis + BullMQ**：部署 Redis，启用异步任务队列
- [ ] **PostgreSQL + pgvector**：切 DB_TYPE=postgres，运行 001_init.sql，建 pgvector 索引
- [ ] **Docker Compose**：编写 docker-compose.yml（NestJS + PostgreSQL + Redis + PaddleOCR + Python 导出）
- [ ] **HTTPS 部署**：配置 SSL 证书
- [ ] **管理后台入口**：开发管理员角色设置界面（当前需手动改 DB）

### 应在 V1.0 完成 (P1)

- [ ] **DOCX/PDF 解析**：安装 mammoth + pdf-parse，实现文件内容自动提取
- [ ] **前端仪表盘图表**：ECharts 饼图/柱状图
- [ ] **上传进度页**：`/pages/admin/upload/progress`
- [ ] **审核详情页**：`/pages/admin/review/detail`
- [ ] **题目详情页**：`/pages/admin/questions/detail`
- [ ] **Cron 定时任务**：订单清理、REJECTED 题目 30 天清理、向量索引重建
- [ ] **日志系统**：NestJS Logger → 文件持久化
- [ ] **健康检查**：GET /health (DB + Redis + COS)

### 可延后 (P2)

- [ ] 管理员角色设置 UI
- [ ] 微信昵称/头像同步
- [ ] 订单筛选增强（时间范围）
- [ ] 文件管理高级筛选

---

# 6. 总进度

| 模块 | 后端完成度 | 前端完成度 | 距生产差距 |
|------|-----------|-----------|-----------|
| Auth + User | 95% | 100% | 微信 API key 配置 |
| KnowledgeBase | 80% | 60% | LLM/OCR/Embedding key + DOCX/PDF解析 + 3个前端页面 |
| Paper | 85% | 100% | LLM key 配置 |
| Order | 90% | 100% | Cron Job |
| Payment | 30% | 100% | 完整微信支付 V3 集成 |
| Export | 20% | - | Python 导出服务完整开发 |
| Admin | 95% | 66% | 图表 + 2个详情页 |
| **整体** | **≈70%** | **≈75%** | **核心阻塞：外部服务 API key 配置** |

> **结论**：业务逻辑骨架完成约 70-75%，所有模块都有 dev fallback 可在本地端到端运行。剩余工作主要集中在三类：**外部 API 对接**（微信/LLM/OCR/COS，已有封装接口）、**支付/导出服务开发**（需写额外 Python 服务）、**前端页面补完**（6 个详情/图表/进度页）。
