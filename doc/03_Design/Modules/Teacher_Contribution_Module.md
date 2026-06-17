# Teacher Contribution & Cashback Module — 教师贡献题 + 返现模块

Version 2.0 | 2026-06-08

---

# 一、需求概述

## 1.1 完整业务闭环

```
教师端:
  ① 首页「上传题目」→ 选文件+学科年级 → AI自动解析
  ② 解析完成 → 预览题目 → 点击「提交审核」
  ③ 我的贡献 → 看审核进度（待审核 / 已入库 / 被驳回）
  ④ 通过 → 自动返现到余额
  ⑤ 余额 → 可抵组卷费 / 可提现到微信

管理员端:
  ① 审核中心 → 待审核题目（标注来源：教师名/管理员）
  ② 通过/拒绝（同现有流程）
  ③ 定价配置 → 设置返现单价（每题 ¥X.XX）
  ④ 提现管理 → 审核教师提现申请
```

## 1.2 与现有流程的关系

```
现有（仅管理员上传）:
  管理员上传 → AI管道 → parsed → 管理员直审 → approved/rejected

新增（教师上传）:
  教师上传 → AI管道 → parsed（草稿）
    → 教师点「提交审核」→ pending_review
    → 管理员审核 → approved → 自动返现 → 余额可抵组卷费、可提现
                  → rejected
```

---

# 二、返现体系：余额 + 抵扣 + 提现，一步到位

## 2.1 三合一设计

```
                ┌──────────────────────────────────────┐
                │           教师余额账户                 │
                │         (user.balance, 分)            │
                └──────┬──────────┬──────────┬─────────┘
                       │          │          │
              审核通过  │    组卷支付│    提现申请│
              (+) 入账  │  (-) 扣款 │  (-) 转出 │
                       │          │          │
                ┌──────┴──────────┴──────────┴─────────┐
                │           balance_log 审计            │
                │    每笔变动：金额/类型/关联业务/余额     │
                └──────────────────────────────────────┘
```

| 功能 | 触发时机 | 操作 | 类型 |
|------|---------|------|------|
| **返现入账** | 管理员审核通过教师贡献的题目 | `balance += cashback × count` | cashback |
| **余额抵扣** | 教师下单组卷时选择余额支付 | `balance -= order.amount` | pay_order |
| **余额提现** | 教师申请提现，管理员审核通过 | `balance -= withdrawal.amount` | withdraw |

## 2.2 管理员配置

管理员在定价配置页设置三项价格：

```
定价配置页:
  ┌─────────────────────────────────────────┐
  │  下载服务    单题价格:  ¥2.00 / 题       │
  │  打印服务    三档计费:  ...              │
  │  返现配置    单题返现:  ¥1.00 / 题  🆕   │
  └─────────────────────────────────────────┘
```

---

# 三、数据库设计

## 3.1 question 表 — 无需改结构

```
状态机（question.status，已是 VARCHAR，直接用新值）:

管理员上传:
  parsed ──────────────────► approved
    │                          │
    └──────────────────────────┼──► rejected

教师上传:
  parsed ──（教师提交）──► pending_review ──（管理员审核）──► approved
                               │                              │
                               └──────────────────────────────┼──► rejected
```

## 3.2 kb_file 表修改

```sql
ALTER TABLE "kb_file"
    ADD COLUMN "submit_status" VARCHAR(32) NOT NULL DEFAULT 'draft';
    -- 'draft' | 'pending_review' | 'reviewed'
    -- draft          = 教师还没提交审核
    -- pending_review = 教师已提交，管理员还没审完
    -- reviewed       = 管理员已处理完该批次所有题目
```

## 3.3 user 表修改

```sql
ALTER TABLE "user"
    ADD COLUMN "balance" INTEGER NOT NULL DEFAULT 0;
    -- 余额，单位：分。正数=可提现金额
```

## 3.4 新增表

### `balance_log` — 余额变动日志

```sql
CREATE TABLE "balance_log" (
    "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id"       UUID NOT NULL REFERENCES "user"("id"),
    "amount"        INTEGER NOT NULL,              -- 变动金额（分），正=入账，负=出账
    "type"          VARCHAR(32) NOT NULL,           -- 'cashback' | 'pay_order' | 'withdraw' | 'admin_adjust'
    "ref_id"        UUID,                           -- 关联业务ID
    "balance_after" INTEGER NOT NULL,               -- 变动后余额
    "note"          VARCHAR(256),
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_balance_log_user ON "balance_log"("user_id");
CREATE INDEX idx_balance_log_type ON "balance_log"("type");
```

### `withdrawal` — 提现申请表

```sql
CREATE TABLE "withdrawal" (
    "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id"       UUID NOT NULL REFERENCES "user"("id"),
    "amount"        INTEGER NOT NULL,              -- 提现金额（分）
    "status"        VARCHAR(32) NOT NULL DEFAULT 'pending',
    -- 'pending' | 'processing' | 'completed' | 'rejected'
    "reviewed_by"   UUID REFERENCES "user"("id"),
    "reviewed_at"   TIMESTAMPTZ,
    "reject_reason" VARCHAR(256),
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_withdrawal_user ON "withdrawal"("user_id");
CREATE INDEX idx_withdrawal_status ON "withdrawal"("status");
```

### 返现配置种子

```sql
INSERT INTO pricing_config (type, tier, min_quantity, max_quantity, unit_price) VALUES
    ('cashback', 1, NULL, NULL, 100);  -- 返现：¥1.00 / 题（管理员可改）
```

---

# 四、API 设计

## 4.1 教师端 — 贡献题

### `POST /v1/contributions/upload`

教师上传题目文件。复用 `UploadService.upload()`，去掉 `@Roles('admin')` 限制。

```
Auth: JWT (teacher / admin)
Content-Type: multipart/form-data
Fields: file, subject, grade

Response:
{ "fileId": "uuid", "filename": "五年级数学题库.docx", "questionCount": 15, "status": "processing" }
```

### `GET /v1/contributions`

查看自己的贡献批次列表。

```
Auth: JWT
GET /v1/contributions?page=1&pageSize=10

Response:
{
  "list": [{
    "fileId": "uuid",
    "filename": "五年级数学题库.docx",
    "subject": "数学",  "grade": "五年级",
    "totalQuestions": 15,
    "approvedCount": 12,  "rejectedCount": 1,  "pendingCount": 2,
    "submitStatus": "pending_review",
    "cashbackEarned": 1200,
    "createdAt": "2026-06-08T10:00:00Z"
  }],
  "pagination": { ... }
}
```

### `GET /v1/contributions/:fileId`

查看某批次所有题目详情。

```
Auth: JWT
Response:
{
  "fileId": "uuid",  "filename": "五年级数学题库.docx",
  "submitStatus": "pending_review",
  "questions": [{
    "id": "uuid",  "type": "single_choice",
    "content": "题目内容...",  "options": ["A. ..."],
    "answer": "A",  "analysis": "解析...",
    "difficulty": 2,
    "status": "approved",
    "knowledgePoints": ["分数运算"],
    "cashbackAmount": 100
  }],
  "stats": { "total": 15, "approved": 12, "rejected": 1, "pending": 2 }
}
```

### `POST /v1/contributions/:fileId/submit`

提交审核。

```
Auth: JWT
校验: batch 属于当前用户 + submit_status = 'draft'
逻辑: 所有 parsed 题目 → pending_review, kb_file.submit_status → pending_review
Response: { "submitted": 15 }
```

---

## 4.2 管理员端 — 审核增强

### `GET /v1/admin/reviews` — 修改

增加来源标注。

```
Auth: JWT (admin)
Response 每道题新增:
"source": {
  "type": "teacher",                  // 'admin' | 'teacher'
  "userName": "张老师",
  "userId": "uuid",
  "fileName": "五年级数学题库.docx",
  "fileId": "uuid"
}
```

### `POST /v1/admin/reviews/batch` — 修改

通过时自动返现。

```
Auth: JWT (admin)
Request: { "questionIds": [...], "action": "approve" | "reject" }

approve 新增逻辑:
  1. 逐题 status → 'approved'
  2. 通过 source_file_id → kb_file → uploader_id 查上传者
  3. 如果是教师上传 (uploader.role = 'teacher'):
     a. 读 cashback 单价（pricing_config WHERE type='cashback'）
     b. user.balance += cashback_price
     c. 写 balance_log (type='cashback', ref_id=questionId, note='题目审核通过: {subject}-{content摘要}')
  4. 该 kb_file 全部题目已审完 → kb_file.submit_status = 'reviewed'
```

---

## 4.3 余额系统

### `GET /v1/users/me/balance`

```
Auth: JWT
Response:
{
  "balance": 3500,          // ¥35.00
  "totalEarned": 5000,      // 累计返现
  "totalSpent": 1500        // 累计支出（组卷+提现）
}
```

### `GET /v1/users/me/balance-log`

```
Auth: JWT
GET /v1/users/me/balance-log?page=1&pageSize=20&type=cashback|pay_order|withdraw

Response:
{
  "list": [{
    "id": "uuid",
    "amount": 100,            // +¥1.00 (正=入账/负=出账)
    "type": "cashback",
    "note": "题目审核通过: 数学-分数运算",
    "balanceAfter": 3500,
    "createdAt": "2026-06-08T12:00:00Z"
  }],
  "pagination": { ... }
}
```

### `POST /v1/orders` — 扩展余额支付

下单时支持 `paymentMethod`。

```
Request:
{
  "paperId": "uuid",
  "type": "download",
  "paymentMethod": "wechat" | "balance"     // 🆕 默认 wechat
}

balance 支付逻辑:
  1. user.balance >= order.amount → 扣款
  2. balance -= amount
  3. 写 balance_log (type='pay_order', amount=-amount)
  4. order.status → 'paid' (跳过微信支付)
  5. user.balance < order.amount → 400 余额不足
```

---

## 4.4 提现系统

### `POST /v1/withdrawals`

教师申请提现。

```
Auth: JWT

校验:
  - amount >= 1000 (最低提现 ¥10.00)
  - amount <= user.balance
  - 无 pending 状态的提现申请

Request: { "amount": 3000 }    // ¥30.00

逻辑:
  1. 创建 withdrawal 记录 (status='pending')
  2. 不立即扣余额（管理员审核通过时才扣）

Response: { "withdrawalId": "uuid", "amount": 3000, "status": "pending" }
```

### `GET /v1/withdrawals`

查看自己的提现记录。

```
Auth: JWT
GET /v1/withdrawals?page=1&pageSize=20

Response:
{
  "list": [{
    "id": "uuid",
    "amount": 3000,
    "status": "completed",
    "reviewedAt": "2026-06-08T15:00:00Z",
    "createdAt": "2026-06-08T14:00:00Z"
  }],
  "pagination": { ... }
}
```

### `GET /v1/admin/withdrawals`

管理员查看提现申请列表。

```
Auth: JWT (admin)
GET /v1/admin/withdrawals?status=pending&page=1&pageSize=20

Response:
{
  "list": [{
    "id": "uuid",
    "userName": "张老师",
    "amount": 3000,
    "balance": 5000,
    "status": "pending",
    "createdAt": "2026-06-08T14:00:00Z"
  }],
  "pagination": { ... }
}
```

### `PUT /v1/admin/withdrawals/:id`

管理员审核提现。

```
Auth: JWT (admin)

Request (通过):  { "action": "approve" }
Request (拒绝):  { "action": "reject", "rejectReason": "余额不足" }

approve 逻辑:
  1. withdrawal.status → 'completed'
  2. user.balance -= amount
  3. 写 balance_log (type='withdraw', amount=-amount)
  4. （生产环境）调用微信商户转账 API

reject 逻辑:
  1. withdrawal.status → 'rejected'
  2. 不扣余额
```

---

## 4.5 返现配置 — 并入现有定价 API

`GET /v1/admin/pricing` 返回：
```json
{
  "download": { "unitPrice": 200, "description": "按题计费" },
  "print": [ { "tier": 1, "minQuantity": 1, "maxQuantity": 10, "unitPrice": 500 }, ... ],
  "cashback": { "unitPrice": 100, "description": "教师贡献题通过审核，每题返现" }
}
```

`PUT /v1/admin/pricing` 支持：
```json
{ "cashback": { "unitPrice": 150 } }
```

---

# 五、前端设计

## 5.1 新增页面 (7个)

### ① 教师上传 — `pages/contribute/upload/index.vue`

```
┌──────────────────────────────────────┐
│  ← 返回    上传题目                   │
├──────────────────────────────────────┤
│  学科: [数学 ▼]   年级: [五年级 ▼]    │
│                                      │
│  ┌────────────────────────────────┐  │
│  │      📤 点击选择文件            │  │
│  │   DOC/DOCX/MD/PDF/图片         │  │
│  └────────────────────────────────┘  │
│  已选: 五年级数学题库.docx (2.3MB)    │
│                                      │
│  ┌──────── 开始上传 ───────────────┐  │
│  └─────────────────────────────────┘  │
│                                      │
│  解析: ████████░░ 80%  识别到15题     │
│  完成后 → 跳转预览页                  │
└──────────────────────────────────────┘
```

### ② 预览提交 — `pages/contribute/preview/index.vue`

```
┌──────────────────────────────────────┐
│  ← 返回    题目预览   五年级数学题库   │
├──────────────────────────────────────┤
│  共15题 | 返现 ¥1.00/题              │
│                                      │
│  第1题 [单选题] 难度:中等              │
│  题目内容...  A... B... C... D...     │
│  答案: B  解析: ...  知识点: 分数运算  │
│  ... (可滚动查看全部15题)              │
│                                      │
│  ┌────── 提交审核 ──────────────────┐ │
│  │  提交后不可修改，等待管理员审核    │ │
│  └─────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### ③ 我的贡献 — `pages/contribute/index.vue`

```
┌──────────────────────────────────────┐
│  ← 返回    我的贡献题                 │
├──────────────────────────────────────┤
│                                      │
│  ┌ 五年级数学题库.docx  [已提交] ──┐  │
│  │ 数学·五年级 | 15题               │  │
│  │ ✅12  ❌1  ⏳2                  │  │
│  │ 💰 返现 ¥12.00                │  │
│  │ 2026-06-08 10:00            >  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌ 三年级语文周练.md  [审核完成] ──┐  │
│  │ 语文·三年级 | 8题                │  │
│  │ ✅8  💰 返现 ¥8.00            │  │
│  │ 2026-06-07 14:00            >  │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### ④ 批次详情 — `pages/contribute/detail/index.vue`

```
┌──────────────────────────────────────┐
│  ← 返回    批次详情                   │
├──────────────────────────────────────┤
│  五年级数学题库.docx | 已提交         │
│                                      │
│  [ ✅ 已通过 12题 ]                   │
│   第1题 [单选] 分数运算      +¥1.00  │
│   第3题 [填空] 小数除法      +¥1.00  │
│                                      │
│  [ ⏳ 待审核 2题 ]                    │
│   第5题 [单选] 几何面积              │
│                                      │
│  [ ❌ 被驳回 1题 ]                    │
│   第2题 [单选] 题目重复              │
└──────────────────────────────────────┘
```

### ⑤ 我的余额 — `pages/profile/balance/index.vue`

```
┌──────────────────────────────────────┐
│  ← 返回    我的余额                   │
├──────────────────────────────────────┤
│        ┌──────────────┐              │
│        │   ¥ 35.00    │              │
│        │   当前余额    │              │
│        └──────────────┘              │
│  累计收入 ¥50.00  累计支出 ¥15.00    │
│                                      │
│  ┌──── 余额支付组卷 ────────────────┐ │
│  └─────────────────────────────────┘ │
│  ┌──── 提现 ───────────────────────┐ │
│  │  最低提现 ¥10.00                 │ │
│  └─────────────────────────────────┘ │
│                                      │
│  ── 明细 ────────────────────────    │
│  +¥1.00  返现:题目审核通过  06-08    │
│  -¥5.00  余额支付组卷订单   06-07    │
│  -¥20.00 提现(已完成)       06-05    │
└──────────────────────────────────────┘
```

### ⑥ 提现申请 — `pages/profile/withdraw/index.vue`

```
┌──────────────────────────────────────┐
│  ← 返回    申请提现                   │
├──────────────────────────────────────┤
│                                      │
│  当前余额: ¥35.00                    │
│  最低提现: ¥10.00                    │
│                                      │
│  提现金额: [___] 元                  │
│                                      │
│  到账方式: 微信零钱                   │
│  预计 1-2 个工作日到账                │
│                                      │
│  ┌──── 确认提现 ────────────────────┐ │
│  └─────────────────────────────────┘ │
│                                      │
│  ⚠ 提现由管理员审核后处理            │
│                                      │
│  ── 提现记录 ────────────────────    │
│  ¥20.00 已完成  2026-06-05           │
│  ¥10.00 待审核  2026-06-08           │
└──────────────────────────────────────┘
```

### ⑦ 管理员提现审核 — `pages/admin/withdrawals/index.vue`

```
┌──────────────────────────────────────┐
│  ← 返回    提现管理                   │
├──────────────────────────────────────┤
│  筛选: [待审核 ▼]                     │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 张老师 | 申请提现 ¥30.00        │  │
│  │ 当前余额: ¥35.00               │  │
│  │ 2026-06-08 14:00               │  │
│  │ [ 通过 ]  [ 拒绝 ]              │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 李老师 | 已完成 ¥20.00          │  │
│  │ 审核时间: 2026-06-05 15:00     │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

## 5.2 修改现有页面

| 页面 | 变更 |
|------|------|
| `pages/index/index.vue` | +「📤 上传题目」入口 |
| `pages/profile/index.vue` | +「我的贡献」「我的余额」菜单 |
| `pages/admin/dashboard/index.vue` | +「提现审核」快捷入口 |
| `pages/admin/review/index.vue` | 审核列表 +「来源」列 |
| `pages/admin/pricing/index.vue` | +「返现单价」配置 |
| `pages/payment/index.vue` | 支付方式: [微信支付] [余额支付] |

## 5.3 路由注册

```json
{ "path": "pages/contribute/index",          "style": { "navigationBarTitleText": "我的贡献" } },
{ "path": "pages/contribute/detail/index",   "style": { "navigationBarTitleText": "批次详情" } },
{ "path": "pages/contribute/upload/index",   "style": { "navigationBarTitleText": "上传题目" } },
{ "path": "pages/contribute/preview/index",  "style": { "navigationBarTitleText": "题目预览" } },
{ "path": "pages/profile/balance/index",     "style": { "navigationBarTitleText": "我的余额" } },
{ "path": "pages/profile/withdraw/index",    "style": { "navigationBarTitleText": "申请提现" } }
```

---

# 六、后端模块结构

```
backend/src/
├── modules/
│   ├── contribution/                     🆕
│   │   ├── contribution.module.ts
│   │   ├── contribution.controller.ts    (上传/列表/详情/提交审核)
│   │   └── services/
│   │       └── contribution.service.ts   (批次聚合统计/提交)
│   ├── balance/                          🆕
│   │   ├── balance.module.ts
│   │   ├── balance.controller.ts         (余额查询/明细)
│   │   ├── withdrawal.controller.ts      (提现申请/列表)
│   │   └── services/
│   │       ├── balance.service.ts        (余额变动/日志/扣款)
│   │       └── withdrawal.service.ts     (提现CRUD/审核)
│   ├── knowledge-base/
│   │   ├── knowledge-base.controller.ts  ✏️ 教师可上传
│   │   └── services/review.service.ts    ✏️ 返现触发
│   ├── payment/
│   │   └── payment.service.ts            ✏️ 创建支付时支持余额支付
│   └── admin/
│       └── admin.controller.ts           ✏️ 提现审核端点
├── database/
│   ├── entities/
│   │   ├── balance-log.entity.ts         🆕
│   │   ├── withdrawal.entity.ts          🆕
│   │   ├── kb-file.entity.ts             ✏️ submit_status
│   │   └── user.entity.ts                ✏️ balance
│   └── migrations/
│       └── 003_contribution_cashback.sql  🆕
```

---

# 七、开发计划

## 总工期：**5.5 天**

| Phase | 内容 | 工期 | 涉及 |
|-------|------|------|------|
| 1 | 数据库 + 后端核心 | 2.0d | Entity/Service/Controller/返现/提现/余额支付 |
| 2 | 前端用户端 | 2.0d | 上传/预览/贡献列表/批次详情/余额/提现申请 |
| 3 | 前端管理端 + 联调 | 1.5d | 审核标注/提现审核/返现配置/余额支付入口 |

### Phase 1 (2.0d)

| # | 任务 | 文件 | 预估 |
|---|------|------|------|
| 1.1 | 数据库迁移 | `003_contribution_cashback.sql` | 0.5h |
| 1.2 | 新 Entity + 修改 Entity | balance-log, withdrawal, kb-file, user | 1h |
| 1.3 | ContributionService | 批次聚合/提交审核 | 1.5h |
| 1.4 | BalanceService | 余额变动/日志/扣款 | 1.5h |
| 1.5 | WithdrawalService | 提现CRUD/审核流转 | 1.5h |
| 1.6 | ReviewService 扩展 | 审核通过触发返现 | 1h |
| 1.7 | PaymentService 扩展 | 支持余额支付方式 | 1h |
| 1.8 | Controller 端点 | contribution + balance + withdrawal | 1.5h |
| 1.9 | 单元测试 | 全部新服务 | 2h |

### Phase 2 (2.0d)

| # | 任务 | 预估 |
|---|------|------|
| 2.1 | 教师上传页 + 预览提交页 | 3h |
| 2.2 | 我的贡献列表 + 批次详情 | 3h |
| 2.3 | 余额页 + 提现申请页 | 3h |
| 2.4 | 首页/个人中心入口 + API/Store | 1.5h |

### Phase 3 (1.5d)

| # | 任务 | 预估 |
|---|------|------|
| 3.1 | 审核列表+来源标注 | 1.5h |
| 3.2 | 管理员提现审核页 | 2h |
| 3.3 | 定价配置+返现配置 | 0.5h |
| 3.4 | 支付页余额支付入口 | 1h |
| 3.5 | E2E联调测试 | 2h |

---

# 八、关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 批次定义 | 一个 `kb_file` = 一个批次 | 复用现有表，上传即创建 |
| 返现触发时机 | 审核通过时同步触发 | 简单可靠，balance_log 可审计 |
| 提现扣款时机 | 管理员审核通过时扣 | 防止用户重复提现 |
| 最低提现额 | ¥10.00 (1000分) | 避免小额提现成本过高 |
| 提现到账方式 | 微信商户转账 (企业付款到零钱) | 微信生态内闭环 |
| 管理员上传是否返现 | 否 | 只对教师上传的题目返现 |
| 余额不足时 | 不可余额支付，回退微信支付 | 保持支付成功率 |

---

> **设计完成。** 完整闭环：教师上传题目 → 提交审核 → 管理员通过 → 自动返现到余额 → 余额可抵组卷费、可提现。管理员可配置返现单价。5.5 天工期。
