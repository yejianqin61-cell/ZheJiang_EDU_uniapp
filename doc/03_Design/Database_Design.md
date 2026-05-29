# Database Design — AI智能组卷小程序

Version 1.0 | 2026-05-29

---

# 1. ERD Overview

```
┌──────────┐       ┌──────────────┐       ┌──────────────┐
│   user   │       │    paper     │       │    order     │
├──────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)  │──┐    │ id (PK)      │──┐    │ id (PK)      │
│ openid   │  │    │ user_id (FK) │  │    │ user_id (FK) │
│ role     │  │    │ title        │  │    │ paper_id(FK) │
│ ...      │  │    │ conditions   │  │    │ amount       │
└──────────┘  │    │ ...          │  │    │ status       │
              │    └──────────────┘  │    │ ...          │
              │                     │    └──────────────┘
              │    ┌──────────────┐  │
              │    │paper_question│  │    ┌──────────────┐
              │    ├──────────────┤  │    │   payment    │
              │    │ paper_id(FK) │  │    ├──────────────┤
              │    │ question_id  │  │    │ order_id(FK) │──┘
              │    │ sort_order   │  │    │ wx_tx_id     │
              │    └──────┬───────┘  │    │ ...          │
              │           │          │    └──────────────┘
              │           ▼          │
              │    ┌──────────────┐  │
              │    │  question    │  │
              │    ├──────────────┤  │
              │    │ id (PK)      │◄─┤
              │    │ type         │  │
              │    │ content      │  │
              │    │ options      │  │
              │    │ answer       │  │
              │    │ analysis     │  │
              │    │ difficulty   │  │
              │    │ subject      │  │
              │    │ grade        │  │
              │    │ status       │  │
              │    │ file_id (FK) │──┐
              │    │ ...          │  │
              │    └──────┬───────┘  │
              │           │          │
              │           ▼          │
              │    ┌──────────────┐  │
              │    │qst_knowledge │  │    ┌──────────────┐
              │    ├──────────────┤  │    │   kb_file    │
              │    │question_id   │──┤    ├──────────────┤
              │    │kp_id (FK)────┼──┐    │ id (PK)      │◄─┘
              │    └──────────────┘  │    │ uploader_id  │
              │                     │    │ filename     │
              │                     │    │ file_type    │
              │                     │    │ subject      │
              │                     │    │ grade        │
              │                     │    │ cos_url      │
              │                     │    │ status       │
              │                     │    │ ...          │
              │                     │    └──────────────┘
              │                     │
              │    ┌──────────────┐  │
              │    │knowledge_point│  │    ┌──────────────┐
              │    ├──────────────┤  │    │   ocr_task   │
              │    │ id (PK)      │◄─┘    ├──────────────┤
              │    │ name         │       │ id (PK)      │
              │    │ subject      │       │ file_id (FK) │──┘
              │    │ grade        │       │ status       │
              │    │ embedding    │       │ result_text  │
              │    │ ...          │       │ ...          │
              └────┴──────────────┘       └──────────────┘
```

---

# 2. Table Definitions

## 2.1 `user` — 用户表

```sql
CREATE TABLE "user" (
    "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "openid"      VARCHAR(128) NOT NULL UNIQUE,
    "role"        VARCHAR(16)  NOT NULL DEFAULT 'teacher',  -- teacher | admin
    "nickname"    VARCHAR(64),
    "avatar_url"  VARCHAR(512),
    "created_at"  TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at"  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_user_openid ON "user"("openid");
```

| Column | Type | Constraint | Description |
|--------|------|-----------|-------------|
| id | UUID | PK | |
| openid | VARCHAR(128) | UNIQUE, NOT NULL | 微信OpenID |
| role | VARCHAR(16) | NOT NULL, DEFAULT 'teacher' | teacher / admin |
| nickname | VARCHAR(64) | nullable | 微信昵称 |
| avatar_url | VARCHAR(512) | nullable | 微信头像URL |
| created_at | TIMESTAMP | NOT NULL | |
| updated_at | TIMESTAMP | NOT NULL | |

---

## 2.2 `kb_file` — 上传文件表

```sql
CREATE TABLE "kb_file" (
    "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "uploader_id"  UUID NOT NULL REFERENCES "user"("id"),
    "filename"     VARCHAR(256) NOT NULL,
    "file_type"    VARCHAR(16) NOT NULL,        -- doc/docx/md/pdf/png/jpg/jpeg
    "file_size"    INTEGER NOT NULL,            -- bytes
    "subject"      VARCHAR(32) NOT NULL,        -- 管理员上传时指定
    "grade"        VARCHAR(32) NOT NULL,        -- 管理员上传时指定
    "cos_url"      VARCHAR(512) NOT NULL,
    "status"       VARCHAR(32) NOT NULL DEFAULT 'uploading',
    -- uploading → processing → completed / failed
    "question_count" INTEGER DEFAULT 0,         -- 解析出的题目数
    "error_msg"    TEXT,
    "created_at"   TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at"   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kb_file_uploader ON "kb_file"("uploader_id");
CREATE INDEX idx_kb_file_status ON "kb_file"("status");
CREATE INDEX idx_kb_file_subject_grade ON "kb_file"("subject", "grade");
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| uploader_id | UUID FK→user | 上传者 |
| filename | VARCHAR(256) | 原始文件名 |
| file_type | VARCHAR(16) | doc/docx/md/pdf/png/jpg/jpeg |
| file_size | INTEGER | 字节数 |
| subject | VARCHAR(32) | **管理员指定**：语文/数学/... |
| grade | VARCHAR(32) | **管理员指定**：如 小学5年级 |
| cos_url | VARCHAR(512) | COS存储路径 |
| status | VARCHAR(32) | uploading→processing→completed/failed |
| question_count | INTEGER | 解析出的题目数量 |
| error_msg | TEXT | 失败原因 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

## 2.3 `ocr_task` — OCR任务表

```sql
CREATE TABLE "ocr_task" (
    "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "file_id"      UUID NOT NULL REFERENCES "kb_file"("id") ON DELETE CASCADE,
    "status"       VARCHAR(32) NOT NULL DEFAULT 'pending',
    -- pending → processing → completed / failed
    "result_text"  TEXT,
    "page_count"   INTEGER,
    "duration_ms"  INTEGER,                   -- 处理耗时
    "error_msg"    TEXT,
    "created_at"   TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at"   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ocr_task_file ON "ocr_task"("file_id");
CREATE INDEX idx_ocr_task_status ON "ocr_task"("status");
```

---

## 2.4 `question` — 题库表

```sql
CREATE TABLE "question" (
    "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "type"          VARCHAR(32) NOT NULL,
    -- single_choice / multi_choice / true_false / fill_blank / short_answer
    "content"       TEXT NOT NULL,             -- 题目正文
    "options"       JSONB,                     -- ["A. ...", "B. ..."] 选择题才有
    "answer"        TEXT NOT NULL,             -- 正确答案
    "analysis"      TEXT,                      -- 解析
    "difficulty"    SMALLINT NOT NULL,         -- 1简单 / 2中等 / 3困难
    "subject"       VARCHAR(32) NOT NULL,      -- 学科
    "grade"         VARCHAR(32) NOT NULL,      -- 年级
    "source_file_id" UUID REFERENCES "kb_file"("id") ON DELETE SET NULL,
    "status"        VARCHAR(32) NOT NULL DEFAULT 'parsed',
    -- parsed → approved / rejected
    "embedding"     vector(1536),              -- pgvector: 题目内容向量
    "is_deleted"    BOOLEAN NOT NULL DEFAULT FALSE,
    "reviewed_by"   UUID REFERENCES "user"("id"),
    "reviewed_at"   TIMESTAMP,
    "created_at"    TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at"    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_question_status ON "question"("status") WHERE "is_deleted" = FALSE;
CREATE INDEX idx_question_subject_grade ON "question"("subject", "grade") WHERE "is_deleted" = FALSE;
CREATE INDEX idx_question_difficulty ON "question"("difficulty") WHERE "is_deleted" = FALSE;
CREATE INDEX idx_question_source ON "question"("source_file_id");
CREATE INDEX idx_question_embedding ON "question" USING ivfflat ("embedding" vector_cosine_ops);
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| type | VARCHAR(32) | 题型枚举 |
| content | TEXT | 题目正文（Markdown） |
| options | JSONB | 选项数组，非选择题为null |
| answer | TEXT | 正确答案 |
| analysis | TEXT | 解析（可为空） |
| difficulty | SMALLINT | 1/2/3 |
| subject | VARCHAR(32) | 继承自上传文件 |
| grade | VARCHAR(32) | 继承自上传文件 |
| source_file_id | UUID FK→kb_file | 来源文件 |
| status | VARCHAR(32) | parsed→approved/rejected |
| embedding | vector(1536) | 语义检索向量 |
| is_deleted | BOOLEAN | 软删除标记 |
| reviewed_by | UUID FK→user | 审核人 |
| reviewed_at | TIMESTAMP | 审核时间 |

---

## 2.5 `knowledge_point` — 知识点表

```sql
CREATE TABLE "knowledge_point" (
    "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"          VARCHAR(128) NOT NULL,
    "subject"       VARCHAR(32) NOT NULL,
    "grade"         VARCHAR(32) NOT NULL,
    "embedding"     vector(1536),              -- 知识点名称向量（用于归并）
    "question_count" INTEGER NOT NULL DEFAULT 0,
    "description"   TEXT,
    "created_at"    TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at"    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_kp_name_subject_grade ON "knowledge_point"("name", "subject", "grade");
CREATE INDEX idx_kp_embedding ON "knowledge_point" USING ivfflat ("embedding" vector_cosine_ops);
```

**去重规则**: name + subject + grade 联合唯一。AI创建前先检查Embedding相似度≥0.92的现有知识点，若存在则归并而非新建。

---

## 2.6 `question_knowledge` — 题目-知识点关联表

```sql
CREATE TABLE "question_knowledge" (
    "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "question_id"        UUID NOT NULL REFERENCES "question"("id") ON DELETE CASCADE,
    "knowledge_point_id"  UUID NOT NULL REFERENCES "knowledge_point"("id") ON DELETE CASCADE,
    "confidence"         REAL NOT NULL DEFAULT 1.0,  -- AI匹配置信度
    UNIQUE ("question_id", "knowledge_point_id")
);

CREATE INDEX idx_qk_question ON "question_knowledge"("question_id");
CREATE INDEX idx_qk_kp ON "question_knowledge"("knowledge_point_id");
```

---

## 2.7 `paper` — 试卷表

```sql
CREATE TABLE "paper" (
    "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id"      UUID NOT NULL REFERENCES "user"("id"),
    "title"        VARCHAR(256) NOT NULL,
    "conditions"   JSONB NOT NULL,
    -- { "subject": "数学", "grade": "五年级", "difficulty": "混合",
    --   "knowledgePoints": [...], "questionCount": 20 }
    "question_ids" UUID[] NOT NULL,            -- 关联题目ID（按序）
    "total_score"  INTEGER NOT NULL DEFAULT 100,
    "generate_ms"  INTEGER,                   -- 生成耗时(ms)
    "status"       VARCHAR(32) NOT NULL DEFAULT 'draft',
    -- draft → paid → exported
    "export_docx_url"  VARCHAR(512),
    "export_pdf_url"   VARCHAR(512),
    "exported_at"  TIMESTAMP,
    "created_at"   TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at"   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_paper_user ON "paper"("user_id");
CREATE INDEX idx_paper_status ON "paper"("status");
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK→user | 创建者 |
| title | VARCHAR(256) | 试卷标题（如"五年级数学单元练习卷"） |
| conditions | JSONB | 组卷条件快照 |
| question_ids | UUID[] | 题目ID有序数组 |
| total_score | INTEGER | 总分 |
| generate_ms | INTEGER | 生成耗时 |
| status | VARCHAR(32) | draft→paid→exported |
| export_docx_url | VARCHAR(512) | DOCX COS链接 |
| export_pdf_url | VARCHAR(512) | PDF COS链接 |
| exported_at | TIMESTAMP | 导出时间 |

---

## 2.8 `order` — 订单表

```sql
CREATE TABLE "order" (
    "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id"      UUID NOT NULL REFERENCES "user"("id"),
    "paper_id"     UUID NOT NULL REFERENCES "paper"("id"),
    "order_no"     VARCHAR(32) NOT NULL UNIQUE,  -- 业务单号
    "amount"       INTEGER NOT NULL,             -- 金额（分）
    "status"       VARCHAR(32) NOT NULL DEFAULT 'pending',
    -- pending → paid → refunded / cancelled / expired
    "paid_at"      TIMESTAMP,
    "expired_at"   TIMESTAMP NOT NULL,           -- pending状态过期时间(24h)
    "created_at"   TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at"   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_user ON "order"("user_id");
CREATE INDEX idx_order_status ON "order"("status");
CREATE INDEX idx_order_expired ON "order"("expired_at") WHERE "status" = 'pending';
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK→user | |
| paper_id | UUID FK→paper | |
| order_no | VARCHAR(32) | 业务单号（唯一） |
| amount | INTEGER | 金额（分），由后台系统配置 |
| status | VARCHAR(32) | pending→paid→refunded/cancelled/expired |
| paid_at | TIMESTAMP | 支付完成时间 |
| expired_at | TIMESTAMP | pending状态过期时间（创建后24小时） |

**清理策略**: pending/cancelled/expired订单创建后**1天**物理删除（Cron Job）。

---

## 2.9 `payment` — 支付记录表

```sql
CREATE TABLE "payment" (
    "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id"        UUID NOT NULL REFERENCES "order"("id"),
    "wx_transaction_id" VARCHAR(64),
    "wx_out_trade_no" VARCHAR(32) NOT NULL UNIQUE,
    "amount"          INTEGER NOT NULL,
    "status"          VARCHAR(32) NOT NULL DEFAULT 'created',
    -- created → success / failed / refund
    "callback_raw"    JSONB,                     -- 微信回调原始数据
    "paid_at"         TIMESTAMP,
    "created_at"      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_order ON "payment"("order_id");
```

---

## 2.10 `paper_question_snapshot` — 试卷题目快照表

```sql
CREATE TABLE "paper_question_snapshot" (
    "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "paper_id"    UUID NOT NULL REFERENCES "paper"("id") ON DELETE CASCADE,
    "sort_order"  SMALLINT NOT NULL,
    "question_id" UUID REFERENCES "question"("id") ON DELETE SET NULL,
    "snapshot"    JSONB NOT NULL,
    -- 题目内容快照: { type, content, options, answer, analysis, difficulty, score }
    UNIQUE ("paper_id", "sort_order")
);

CREATE INDEX idx_pqs_paper ON "paper_question_snapshot"("paper_id");
```

> 试卷生成后保存题目快照，防止原题被删除后试卷内容丢失。

---

## 2.11 `audit_log` — 审计日志表

```sql
CREATE TABLE "audit_log" (
    "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id"     UUID REFERENCES "user"("id"),
    "action"      VARCHAR(64) NOT NULL,
    "resource"    VARCHAR(64) NOT NULL,
    "resource_id" UUID,
    "detail"      JSONB,
    "ip"          INET,
    "created_at"  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON "audit_log"("user_id");
CREATE INDEX idx_audit_action ON "audit_log"("action");
CREATE INDEX idx_audit_created ON "audit_log"("created_at");
```

---

# 3. pgvector Configuration

## 3.1 Extension Setup

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## 3.2 Index Strategy

| Table | Column | Index Type | Purpose |
|-------|--------|-----------|---------|
| question | embedding | IVFFlat (cosine) | 组卷时语义检索题目 |
| knowledge_point | embedding | IVFFlat (cosine) | 知识点匹配与归并 |

```sql
-- IVFFlat probes 配置
SET ivfflat.probes = 10;
```

## 3.3 Embedding Dimension

使用 1536 维向量（与 Qwen3 Embedding 模型匹配）。若使用其他Embedding模型需调整维度。

---

# 4. Data Retention & Cleanup

| Table | Rule | Mechanism |
|-------|------|-----------|
| order (pending/cancelled/expired) | 创建后1天删除 | Cron Job @daily |
| question (REJECTED) | 30天后清除 | Cron Job @daily |
| payment (created >24h unpaid) | 标记关联订单为expired | Cron Job @every 30min |
| paper (draft, 无关联订单) | 7天后清除 | Cron Job @daily |
| audit_log | 保留6个月 | Cron Job @monthly |

---

# 5. Index Summary

```sql
-- 高频查询索引
CREATE INDEX idx_user_openid ON "user"("openid");
CREATE INDEX idx_question_status_del ON "question"("status", "is_deleted");
CREATE INDEX idx_question_subject_grade_del ON "question"("subject", "grade", "is_deleted");
CREATE INDEX idx_paper_user_status ON "paper"("user_id", "status");
CREATE INDEX idx_order_user_status ON "order"("user_id", "status");
CREATE INDEX idx_kb_file_status_subject ON "kb_file"("status", "subject");

-- 全文搜索索引 (题目关键词搜索)
CREATE INDEX idx_question_content_fts ON "question"
    USING gin (to_tsvector('simple', "content"));
```
