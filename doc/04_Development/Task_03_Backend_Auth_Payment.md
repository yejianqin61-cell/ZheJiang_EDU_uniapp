# Task 03 — 后端改造：短信登录 + 支付宝支付

**关联文档**：[Blueprint](../03_Design/Web_Migration_Blueprint.md)  
**前置依赖**：无（独立于前端开发）  
**预估工时**：2 天

---

## 目标

1. 新增**短信验证码登录**（替代微信小程序 code2session）
2. 新增**支付宝电脑网站支付**（替代微信 JSAPI）
3. 用户实体 + 支付实体字段调整
4. 数据库迁移

**不动的模块**：AI 管线（OCR/切题/标注/知识点）、导出、审核、题库管理、订单核心逻辑、RBAC

---

## Day 1：短信验证码登录

### 1. 安装依赖 (0.25h)

- [ ] `npm install @alicloud/dysmsapi20170525` — 阿里云短信 SDK
- [ ] `npm install ioredis` — Redis 客户端（存验证码）
- [ ] （如果已有 Redis，跳过安装；确认 BullMQ 复用的 Redis 连接可用）

### 2. 数据库迁移 (0.5h)

- [ ] 创建 `backend/src/database/migrations/003_web_migration.sql`

```sql
-- 用户表：添加手机号
ALTER TABLE "user"
    ALTER COLUMN "openid" DROP NOT NULL,
    ADD COLUMN "phone"       VARCHAR(16),
    ADD COLUMN "phone_verified" BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_phone ON "user"("phone") WHERE "phone" IS NOT NULL;

-- 支付表：字段重命名
ALTER TABLE "payment"
    RENAME COLUMN "wx_transaction_id" TO "transaction_id",
    RENAME COLUMN "wx_out_trade_no"   TO "out_trade_no";
ALTER TABLE "payment"
    ADD COLUMN "provider" VARCHAR(16) NOT NULL DEFAULT 'alipay';

-- 更新 comment
COMMENT ON TABLE "payment" IS '支付记录（通用，支持支付宝/微信）';
```

- [ ] 更新 `user.entity.ts` — 添加 `phone` 字段

```typescript
@Column({ type: 'varchar', length: 16, nullable: true, unique: true })
phone: string | null;

@Column({ type: 'boolean', default: false, name: 'phone_verified' })
phoneVerified: boolean;
```

- [ ] 更新 `payment.entity.ts` — 字段重命名 + 添加 `provider`

### 3. 配置更新 (0.25h)

- [ ] `backend/src/config/configuration.ts` — 新增配置块

```typescript
// 新增
sms: {
    accessKeyId: process.env.ALIBABA_ACCESS_KEY_ID ?? '',
    accessKeySecret: process.env.ALIBABA_ACCESS_KEY_SECRET ?? '',
    signName: process.env.SMS_SIGN_NAME ?? 'AI智能组卷',
    templateCode: process.env.SMS_TEMPLATE_CODE ?? 'SMS_XXXXXXXX',
},
alipay: {
    appId: process.env.ALIPAY_APP_ID ?? '',
    privateKey: process.env.ALIPAY_PRIVATE_KEY ?? '',
    publicKey: process.env.ALIPAY_PUBLIC_KEY ?? '',
    notifyUrl: process.env.ALIPAY_NOTIFY_URL ?? '',
    returnUrl: process.env.ALIPAY_RETURN_URL ?? '',
},
```

- [ ] 更新 `.env` 模板

```bash
# === 短信验证码 ===
ALIBABA_ACCESS_KEY_ID=
ALIBABA_ACCESS_KEY_SECRET=
SMS_SIGN_NAME=AI智能组卷
SMS_TEMPLATE_CODE=

# === 支付宝 ===
ALIPAY_APP_ID=
ALIPAY_PRIVATE_KEY=
ALIPAY_PUBLIC_KEY=
ALIPAY_NOTIFY_URL=https://域名.com/v1/payment/alipay/callback
ALIPAY_RETURN_URL=https://域名.com/orders

# === 管理员 ===
ADMIN_PHONES=13800138000
```

### 4. 短信服务 `sms.service.ts` (1.5h)

- [ ] 新建 `backend/src/modules/auth/services/sms.service.ts`

```typescript
@Injectable()
export class SmsService {
    constructor(
        private readonly config: ConfigService,
        private readonly redis: RedisService,  // 复用现有 Redis
    ) {}

    /** 发送短信验证码 */
    async sendCode(phone: string): Promise<void> {
        // 1. 校验手机号格式
        if (!/^1[3-9]\d{9}$/.test(phone)) throw new BadRequestException('手机号格式不正确');

        // 2. 频率限制：60 秒内不可重复发送
        const limitKey = `sms:limit:${phone}`;
        const limited = await this.redis.get(limitKey);
        if (limited) throw new TooManyRequestsException('发送太频繁，请 60 秒后再试');

        // 3. 生成 6 位随机验证码
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // 4. 存入 Redis（5 分钟有效）
        await this.redis.set(`sms:code:${phone}`, code, 'EX', 300);
        await this.redis.set(limitKey, '1', 'EX', 60);

        // 5. 发送短信（生产） 或 控制台打印（开发）
        if (process.env.NODE_ENV === 'production') {
            await this.sendViaAlibaba(phone, code);
        } else {
            console.log(`[DEV] 验证码 ${code} → ${phone}`);
        }
    }

    /** 校验验证码 */
    async verifyCode(phone: string, code: string): Promise<boolean> {
        const stored = await this.redis.get(`sms:code:${phone}`);
        if (!stored) throw new BadRequestException('验证码已过期');
        if (stored !== code) throw new BadRequestException('验证码不正确');
        await this.redis.del(`sms:code:${phone}`); // 一次性使用
        return true;
    }

    /** 阿里云短信发送 */
    private async sendViaAlibaba(phone: string, code: string) { ... }
}
```

### 5. Auth 模块改造 (1h)

- [ ] `auth.controller.ts` — 新增 2 个端点

```typescript
@Public()
@Post('send-sms')
async sendSms(@Body() dto: SendSmsDto) {
    await this.smsService.sendCode(dto.phone);
    return { code: 0, message: '验证码已发送' };
}

@Public()
@Post('login')
async login(@Body() dto: LoginDto) {
    // 新：短信验证码登录
    if (dto.phone) {
        await this.smsService.verifyCode(dto.phone, dto.smsCode);
        return this.authService.loginByPhone(dto.phone);
    }
    // 旧：微信 code 登录（保留兼容）
    if (dto.code) {
        return this.authService.loginByWxCode(dto.code);
    }
    throw new BadRequestException('请使用手机号登录');
}
```

- [ ] `auth.service.ts` — 新增 `loginByPhone()`

```typescript
async loginByPhone(phone: string) {
    let user = await this.userRepo.findOne({ where: { phone } });
    if (!user) {
        // 首次登录 → 自动注册
        const adminPhones = (process.env.ADMIN_PHONES ?? '').split(',').map(s => s.trim());
        const isAdmin = adminPhones.includes(phone);
        user = this.userRepo.create({ phone, phoneVerified: true, role: isAdmin ? 'admin' : 'teacher' });
        await this.userRepo.save(user);
    }
    const token = this.jwtService.sign({ sub: user.id, phone, role: user.role });
    return { accessToken: token, role: user.role, phone };
}
```

- [ ] `auth.service.ts` — 保留 `loginByWxCode()` 方法（标记 `@Deprecated`，未来可能重新启用）

### 6. DTO 更新 (0.25h)

- [ ] `SendSmsDto`: `{ phone: string }` + 手机号格式校验
- [ ] `LoginDto`: `{ phone?: string; smsCode?: string; code?: string }` — 所有字段可选，二选一登录

### 7. JWT 策略更新 (0.25h)

```typescript
// jwt.strategy.ts
async validate(payload: { sub: string; phone?: string; openid?: string; role: string }) {
    return { id: payload.sub, phone: payload.phone, openid: payload.openid, role: payload.role };
}
```

### 8. 种子数据更新 (0.5h)

- [ ] `seed.service.ts` — 如果种子用户用的是 `openid`，改为用 `phone` 或保持兼容
- [ ] Dev 模式下默认管理员：`phone='admin_test'` → 或者直接用真实手机号

---

## Day 2：支付宝电脑网站支付

### 9. 安装依赖 (0.25h)

- [ ] `npm install alipay-sdk` — 支付宝官方 Node.js SDK

### 10. 支付宝 Provider (2h)

- [ ] 新建 `backend/src/modules/payment/providers/alipay.provider.ts`

```typescript
@Injectable()
export class AlipayProvider implements PaymentProvider {
    readonly name = 'alipay';
    readonly displayName = '支付宝';

    constructor(private config: ConfigService) {}

    async createPayment(order: OrderEntity): Promise<PaymentResult> {
        const alipay = new AlipaySdk({
            appId: this.config.get('alipay.appId'),
            privateKey: this.config.get('alipay.privateKey'),
            alipayPublicKey: this.config.get('alipay.publicKey'),
        });

        const formHtml = alipay.pageExec('alipay.trade.page.pay', {
            method: 'GET',
            bizContent: {
                out_trade_no: order.outTradeNo,
                total_amount: (order.amount / 100).toFixed(2),
                subject: order.paperTitle,
                product_code: 'FAST_INSTANT_TRADE_PAY',
            },
            returnUrl: this.config.get('alipay.returnUrl'),
            notifyUrl: this.config.get('alipay.notifyUrl'),
        });

        return {
            provider: 'alipay',
            payForm: formHtml, // HTML 表单字符串，前端直接 innerHTML 然后 submit
        };
    }

    async verifyCallback(data: Record<string, string>): Promise<CallbackResult> {
        const alipay = new AlipaySdk({ ... });
        const ok = alipay.checkNotifySign(data);
        if (!ok) throw new BadRequestException('支付宝签名验证失败');

        // 验证是否是支付宝发来的通知
        if (data.notify_id) {
            const verified = await alipay.verifyNotify(data.notify_id);
            if (!verified) throw new BadRequestException('通知验证失败');
        }

        if (data.trade_status !== 'TRADE_SUCCESS') {
            return { success: false, outTradeNo: data.out_trade_no, transactionId: '', amount: 0 };
        }

        return {
            success: true,
            outTradeNo: data.out_trade_no,
            transactionId: data.trade_no,
            amount: Math.round(parseFloat(data.total_amount) * 100), // 元 → 分
        };
    }

    isAvailable(): boolean {
        return !!this.config.get('alipay.appId');
    }
}
```

### 11. 支付服务适配 (1h)

- [ ] `payment.service.ts` — 重构 `createPayment()`

```typescript
async createPayment(orderId: string): Promise<PaymentResult> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');

    // 创建支付记录
    const payment = this.paymentRepo.create({
        orderId,
        outTradeNo: this.generateOutTradeNo(),
        amount: order.amount,
        provider: 'alipay',
        status: 'pending',
    });
    await this.paymentRepo.save(payment);

    // 调用支付宝
    const result = await this.alipayProvider.createPayment(order);
    return result;
}
```

- [ ] `payment.controller.ts` — 新增支付宝回调端点

```typescript
@Public()
@Post('alipay/callback')
async alipayCallback(@Body() body: any) {
    const result = await this.alipayProvider.verifyCallback(body);
    if (result.success) {
        await this.paymentService.markPaid(result.outTradeNo, result.transactionId);
    }
    return 'success'; // 支付宝要求返回 success
}
```

- [ ] `payment.controller.ts` — 支付状态查询端点（前端轮询用）

```typescript
@Get('status/:orderId')
async checkStatus(@Param('orderId') orderId: string) {
    const payment = await this.paymentService.findByOrderId(orderId);
    return { paid: payment?.status === 'paid' };
}
```

### 12. 订单创建适配 (0.5h)

- [ ] `order.controller.ts` — 返回格式变更

```typescript
// 旧: { orderId, orderNo, wxPayParams: {...} }
// 新: { orderId, orderNo, payment: { provider: 'alipay', payForm: '<form>...' } }
```

- [ ] 前端拿到 `payForm` 后：`document.body.innerHTML += payForm; document.forms[0].submit();`

### 13. 测试适配 (剩余时间)

- [ ] `auth.service.spec.ts` — 新增测试用例
  - ✅ 短信验证码发送（Dev 模式验证码打印）
  - ✅ 首次手机号登录 → 自动注册
  - ✅ 已注册手机号登录
  - ✅ 60 秒内重复发送被拒绝
  - ✅ 错误验证码被拒绝
  - ✅ ADMIN_PHONES 管理员自动识别

- [ ] `alipay.provider.spec.ts` 🆕
  - ✅ 支付表单生成
  - ✅ 回调签名校验（有效签名 / 伪造签名）
  - ✅ 回调状态校验（TRADE_SUCCESS / TRADE_CLOSED）

- [ ] `payment.service.spec.ts` — 适配
  - `wxPayParams` → `payForm`
  - `wxOutTradeNo` → `outTradeNo`

---

## 验收标准

- [ ] `POST /v1/auth/send-sms { phone }` → 控制台打印验证码（Dev 模式）
- [ ] `POST /v1/auth/login { phone, smsCode }` → 返回 JWT
- [ ] 首次登录手机号自动创建用户 + 分配角色
- [ ] 60 秒内重复发送被拒绝（429）
- [ ] 错误/过期验证码被拒绝
- [ ] ADMIN_PHONES 配置的手机号首次登录 → role = admin
- [ ] `POST /v1/orders` → 返回支付宝 HTML 表单
- [ ] 支付宝回调 → 订单状态更新为 paid
- [ ] `GET /v1/payment/status/:orderId` → 返回支付状态
- [ ] 旧微信支付代码编译不报错（保留不动）
- [ ] 所有后端测试通过
