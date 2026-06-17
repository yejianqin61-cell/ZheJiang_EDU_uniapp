-- ============================================
-- AI智能组卷 — 教师贡献题 + 返现 + 提现
-- Version 1.0 | 2026-06-08
-- ============================================

-- 1. ALTER: kb_file — 提交状态
ALTER TABLE "kb_file"
    ADD COLUMN "submit_status" VARCHAR(32) NOT NULL DEFAULT 'draft';

-- 2. ALTER: user — 余额
ALTER TABLE "user"
    ADD COLUMN "balance" INTEGER NOT NULL DEFAULT 0;

-- 3. NEW: balance_log — 余额变动日志
CREATE TABLE "balance_log" (
    "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id"       UUID NOT NULL REFERENCES "user"("id"),
    "amount"        INTEGER NOT NULL,
    "type"          VARCHAR(32) NOT NULL,
    "ref_id"        UUID,
    "balance_after" INTEGER NOT NULL,
    "note"          VARCHAR(256),
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_balance_log_user ON "balance_log"("user_id");
CREATE INDEX idx_balance_log_type ON "balance_log"("type");

-- 4. NEW: withdrawal — 提现申请
CREATE TABLE "withdrawal" (
    "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id"       UUID NOT NULL REFERENCES "user"("id"),
    "amount"        INTEGER NOT NULL,
    "status"        VARCHAR(32) NOT NULL DEFAULT 'pending',
    "reviewed_by"   UUID REFERENCES "user"("id"),
    "reviewed_at"   TIMESTAMPTZ,
    "reject_reason" VARCHAR(256),
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_withdrawal_user ON "withdrawal"("user_id");
CREATE INDEX idx_withdrawal_status ON "withdrawal"("status");

-- 5. SEED: 返现配置
INSERT INTO pricing_config (type, tier, min_quantity, max_quantity, unit_price) VALUES
    ('cashback', 1, NULL, NULL, 100);
