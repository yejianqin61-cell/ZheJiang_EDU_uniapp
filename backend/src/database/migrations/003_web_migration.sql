-- =====================================================
-- 003_web_migration: 小程序 → Web 转型
-- =====================================================

-- 1. 用户表：openid 改为可选，新增手机号
ALTER TABLE "user"
    ALTER COLUMN "openid" DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS "phone" VARCHAR(16),
    ADD COLUMN IF NOT EXISTS "phone_verified" BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_phone ON "user"("phone") WHERE "phone" IS NOT NULL;

-- 2. 支付表：重命名微信字段为通用字段，新增 provider
ALTER TABLE "payment"
    RENAME COLUMN "wx_transaction_id" TO "transaction_id";
ALTER TABLE "payment"
    RENAME COLUMN "wx_out_trade_no" TO "out_trade_no";
ALTER TABLE "payment"
    ADD COLUMN IF NOT EXISTS "provider" VARCHAR(16) NOT NULL DEFAULT 'alipay';

-- 3. 更新注释
COMMENT ON TABLE "payment" IS '支付记录（通用，支持支付宝/微信）';
