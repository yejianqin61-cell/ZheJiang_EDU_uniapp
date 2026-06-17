-- ============================================
-- AI智能组卷小程序 — 打印服务 + 定价配置
-- Version 2.0 | 2026-06-08
-- ============================================

-- 1. NEW: shipping_address — 收货地址
-- ============================================
CREATE TABLE "shipping_address" (
    "id"            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id"       UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "receiver_name" VARCHAR(32) NOT NULL,
    "phone"         VARCHAR(20) NOT NULL,
    "province"      VARCHAR(32) NOT NULL,
    "city"          VARCHAR(32) NOT NULL,
    "district"      VARCHAR(32) NOT NULL,
    "detail"        VARCHAR(256) NOT NULL,
    "is_default"    BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_addr_user ON "shipping_address"("user_id");

-- 2. NEW: pricing_config — 定价配置
-- ============================================
CREATE TABLE "pricing_config" (
    "id"            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "type"          VARCHAR(16) NOT NULL,
    "tier"          SMALLINT NOT NULL DEFAULT 1,
    "min_quantity"  INTEGER,
    "max_quantity"  INTEGER,
    "unit_price"    INTEGER NOT NULL,
    "updated_by"    UUID REFERENCES "user"("id"),
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE ("type", "tier")
);

-- Seed pricing data
INSERT INTO pricing_config (type, tier, min_quantity, max_quantity, unit_price) VALUES
    ('download', 1, NULL, NULL, 200),
    ('print',    1, 1,    10,   500),
    ('print',    2, 11,   50,   400),
    ('print',    3, 51,   NULL, 300);

-- 3. ALTER: order — 扩展字段
-- ============================================
ALTER TABLE "order"
    ADD COLUMN "type"                  VARCHAR(16) NOT NULL DEFAULT 'download',
    ADD COLUMN "copies"                INTEGER,
    ADD COLUMN "shipping_address_id"   UUID REFERENCES "shipping_address"("id"),
    ADD COLUMN "shipping_snapshot"     JSONB,
    ADD COLUMN "pricing_snapshot"      JSONB,
    ADD COLUMN "unit_price"            INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "print_status"          VARCHAR(32);

CREATE INDEX idx_order_type ON "order"("type");
CREATE INDEX idx_order_print_status ON "order"("print_status") WHERE "type" = 'print';
