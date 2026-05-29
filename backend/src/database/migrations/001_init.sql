-- ============================================
-- AI智能组卷小程序 — 初始数据库迁移
-- Version 1.0 | 2026-05-29
-- ============================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Tables
-- ============================================

-- 2.1 user
CREATE TABLE "user" (
    "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "openid"      VARCHAR(128) NOT NULL,
    "role"        VARCHAR(16)  NOT NULL DEFAULT 'teacher',
    "nickname"    VARCHAR(64),
    "avatar_url"  VARCHAR(512),
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_user_openid ON "user"("openid");

-- 2.2 kb_file
CREATE TABLE "kb_file" (
    "id"             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "uploader_id"    UUID NOT NULL REFERENCES "user"("id"),
    "filename"       VARCHAR(256) NOT NULL,
    "file_type"      VARCHAR(16) NOT NULL,
    "file_size"      INTEGER NOT NULL,
    "subject"        VARCHAR(32) NOT NULL,
    "grade"          VARCHAR(32) NOT NULL,
    "cos_url"        VARCHAR(512) NOT NULL,
    "status"         VARCHAR(32) NOT NULL DEFAULT 'uploading',
    "question_count" INTEGER DEFAULT 0,
    "error_msg"      TEXT,
    "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_kb_file_uploader ON "kb_file"("uploader_id");
CREATE INDEX idx_kb_file_status ON "kb_file"("status");
CREATE INDEX idx_kb_file_subject_grade ON "kb_file"("subject", "grade");

-- 2.3 ocr_task
CREATE TABLE "ocr_task" (
    "id"           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "file_id"      UUID NOT NULL REFERENCES "kb_file"("id") ON DELETE CASCADE,
    "status"       VARCHAR(32) NOT NULL DEFAULT 'pending',
    "result_text"  TEXT,
    "page_count"   INTEGER,
    "duration_ms"  INTEGER,
    "error_msg"    TEXT,
    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ocr_task_file ON "ocr_task"("file_id");
CREATE INDEX idx_ocr_task_status ON "ocr_task"("status");

-- 2.4 question
CREATE TABLE "question" (
    "id"             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "type"           VARCHAR(32) NOT NULL,
    "content"        TEXT NOT NULL,
    "options"        JSONB,
    "answer"         TEXT NOT NULL,
    "analysis"       TEXT,
    "difficulty"     SMALLINT NOT NULL,
    "subject"        VARCHAR(32) NOT NULL,
    "grade"          VARCHAR(32) NOT NULL,
    "source_file_id" UUID REFERENCES "kb_file"("id") ON DELETE SET NULL,
    "status"         VARCHAR(32) NOT NULL DEFAULT 'parsed',
    "embedding"      vector(1536),
    "is_deleted"     BOOLEAN NOT NULL DEFAULT FALSE,
    "reviewed_by"    UUID REFERENCES "user"("id"),
    "reviewed_at"    TIMESTAMPTZ,
    "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_question_status ON "question"("status") WHERE "is_deleted" = FALSE;
CREATE INDEX idx_question_subject_grade ON "question"("subject", "grade") WHERE "is_deleted" = FALSE;
CREATE INDEX idx_question_difficulty ON "question"("difficulty") WHERE "is_deleted" = FALSE;
CREATE INDEX idx_question_source ON "question"("source_file_id");
CREATE INDEX idx_question_embedding ON "question" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- 2.5 knowledge_point
CREATE TABLE "knowledge_point" (
    "id"             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name"           VARCHAR(128) NOT NULL,
    "subject"        VARCHAR(32) NOT NULL,
    "grade"          VARCHAR(32) NOT NULL,
    "embedding"      vector(1536),
    "question_count" INTEGER NOT NULL DEFAULT 0,
    "description"    TEXT,
    "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_kp_name_subject_grade ON "knowledge_point"("name", "subject", "grade");
CREATE INDEX idx_kp_embedding ON "knowledge_point" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 10);

-- 2.6 question_knowledge
CREATE TABLE "question_knowledge" (
    "id"                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "question_id"        UUID NOT NULL REFERENCES "question"("id") ON DELETE CASCADE,
    "knowledge_point_id"  UUID NOT NULL REFERENCES "knowledge_point"("id") ON DELETE CASCADE,
    "confidence"         REAL NOT NULL DEFAULT 1.0,
    UNIQUE ("question_id", "knowledge_point_id")
);
CREATE INDEX idx_qk_question ON "question_knowledge"("question_id");
CREATE INDEX idx_qk_kp ON "question_knowledge"("knowledge_point_id");

-- 2.7 paper
CREATE TABLE "paper" (
    "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id"         UUID NOT NULL REFERENCES "user"("id"),
    "title"           VARCHAR(256) NOT NULL,
    "conditions"      JSONB NOT NULL,
    "question_ids"    UUID[] NOT NULL,
    "total_score"     INTEGER NOT NULL DEFAULT 100,
    "generate_ms"     INTEGER,
    "status"          VARCHAR(32) NOT NULL DEFAULT 'draft',
    "export_docx_url" VARCHAR(512),
    "export_pdf_url"  VARCHAR(512),
    "exported_at"     TIMESTAMPTZ,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_paper_user ON "paper"("user_id");
CREATE INDEX idx_paper_status ON "paper"("status");

-- 2.8 order
CREATE TABLE "order" (
    "id"           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id"      UUID NOT NULL REFERENCES "user"("id"),
    "paper_id"     UUID NOT NULL REFERENCES "paper"("id"),
    "order_no"     VARCHAR(32) NOT NULL,
    "amount"       INTEGER NOT NULL,
    "status"       VARCHAR(32) NOT NULL DEFAULT 'pending',
    "paid_at"      TIMESTAMPTZ,
    "expired_at"   TIMESTAMPTZ NOT NULL,
    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_order_no ON "order"("order_no");
CREATE INDEX idx_order_user ON "order"("user_id");
CREATE INDEX idx_order_status ON "order"("status");
CREATE INDEX idx_order_expired ON "order"("expired_at") WHERE "status" = 'pending';

-- 2.9 payment
CREATE TABLE "payment" (
    "id"                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "order_id"          UUID NOT NULL REFERENCES "order"("id"),
    "wx_transaction_id" VARCHAR(64),
    "wx_out_trade_no"   VARCHAR(32) NOT NULL,
    "amount"            INTEGER NOT NULL,
    "status"            VARCHAR(32) NOT NULL DEFAULT 'created',
    "callback_raw"      JSONB,
    "paid_at"           TIMESTAMPTZ,
    "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_payment_out_trade_no ON "payment"("wx_out_trade_no");
CREATE INDEX idx_payment_order ON "payment"("order_id");

-- 2.10 paper_question_snapshot
CREATE TABLE "paper_question_snapshot" (
    "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "paper_id"    UUID NOT NULL REFERENCES "paper"("id") ON DELETE CASCADE,
    "sort_order"  SMALLINT NOT NULL,
    "question_id" UUID REFERENCES "question"("id") ON DELETE SET NULL,
    "snapshot"    JSONB NOT NULL,
    UNIQUE ("paper_id", "sort_order")
);
CREATE INDEX idx_pqs_paper ON "paper_question_snapshot"("paper_id");

-- 2.11 audit_log
CREATE TABLE "audit_log" (
    "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id"     UUID REFERENCES "user"("id"),
    "action"      VARCHAR(64) NOT NULL,
    "resource"    VARCHAR(64) NOT NULL,
    "resource_id" UUID,
    "detail"      JSONB,
    "ip"          INET,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_user ON "audit_log"("user_id");
CREATE INDEX idx_audit_action ON "audit_log"("action");
CREATE INDEX idx_audit_created ON "audit_log"("created_at");

-- 3. Full-text search index
CREATE INDEX idx_question_content_fts ON "question"
    USING gin (to_tsvector('simple', "content"));
