# Web 转型蓝图 — AI智能组卷系统

Version 3.0 (Final) | 2026-06-17

---

从「微信小程序 (UniApp)」全线转型为「PC Web 网站 (Vue3 SPA)」，零微信依赖。

---

# 一、最终技术决策

| 模块 | 原方案 | 最终方案 | 理由 |
|------|--------|---------|------|
| **前端框架** | UniApp (Vue3) | Vue 3.4 + Vite 5 | 标准 Web SPA |
| **UI 组件库** | UniApp 内置组件 | Element Plus | PC 组件丰富 |
| **路由** | pages.json | Vue Router 4 | — |
| **登录** | wx.login → code2session | **手机号 + 短信验证码** | 零微信依赖，阿里云短信 |
| **支付** | wx.requestPayment → 微信 JSAPI | **支付宝电脑网站支付** | 审核快，API 清晰 |
| **布局** | 底部 TabBar (375px) | **顶部横向导航** (1200px 居中) | PC 桌面优先 |
| **CSS** | rpx | px | PC 固定宽度 |
| **HTTP** | uni.request | axios | — |
| **存储** | uni.setStorageSync | localStorage | — |
| **文件** | uni.uploadFile / uni.downloadFile | axios FormData / window.open | — |

---

# 二、登录方案：手机号 + 短信验证码

## 2.1 流程图

```
用户访问网站
    ↓
输入手机号 → 点击「获取验证码」
    ↓
POST /v1/auth/send-sms { phone }
    ↓
阿里云短信发送 6 位验证码（5 分钟有效，60 秒间隔）
    ↓
用户输入验证码 → 点击「登录」
    ↓
POST /v1/auth/login { phone, smsCode }
    ↓
后端验证 → 首次登录自动注册 → 签发 JWT
    ↓
前端存 Token → router.push('/')
```

## 2.2 后端新增 API

| 端点 | 说明 |
|------|------|
| `POST /v1/auth/send-sms` | 发送短信验证码 `{ phone }` |
| `POST /v1/auth/login` | 短信验证码登录 `{ phone, smsCode }` |

> 旧 `POST /v1/auth/login { code }` 标记 `@Deprecated`，保留不删（未来可能加其他 OAuth）。

## 2.3 用户实体变更

```sql
ALTER TABLE "user"
    ALTER COLUMN "openid" DROP NOT NULL,    -- 改为可选（未来 OAuth 扩展用）
    ADD COLUMN "phone" VARCHAR(16) UNIQUE,   -- 🆕 手机号（唯一）
    ADD COLUMN "phone_verified" BOOLEAN DEFAULT TRUE; -- 首次登录即视为已验证
```

## 2.4 AuthService 核心逻辑

```typescript
// 发送短信验证码
async sendSmsCode(phone: string) {
    // 1. 校验手机号格式
    // 2. 频率限制：同一手机号 60 秒内不可重复发送
    // 3. 生成 6 位随机码 → 存 Redis（key=sms:phone, TTL=5min）
    // 4. 调阿里云 SMS API 发送
    // 5. Dev 模式：控制台打印验证码（跳过短信发送）
}

// 短信验证码登录
async login(phone: string, smsCode: string) {
    // 1. 从 Redis 取验证码，校验
    // 2. 查用户 by phone，不存在则自动注册
    // 3. 管理员识别：ADMIN_PHONES 环境变量
    // 4. 签发 JWT: { sub: userId, phone, role }
    // 5. 删除已用验证码
}
```

## 2.5 阿里云短信接入

| 事项 | 说明 |
|------|------|
| 服务 | 阿里云短信服务 (Dysmsapi) |
| 费用 | 0.045 元/条 |
| 签名 | 需审核（1 个工作日），如"AI智能组卷" |
| 模板 | 需审核（1 个工作日），如"您的验证码是${code}，5分钟内有效" |
| SDK | `@alicloud/dysmsapi20170525` |
| 回退 | Dev 模式控制台打印验证码，不发送短信 |

## 2.6 管理员指定

```bash
# .env.production
ADMIN_PHONES=13800138000,13900139000  # 管理员的手机号，首次登录自动设为 admin
```

---

# 三、支付方案：支付宝电脑网站支付

## 3.1 流程图

```
用户点击「支付」
    ↓
POST /v1/orders 创建订单
    ↓
后端调支付宝 alipay.trade.page.pay
    ↓
返回支付宝 HTML 表单（自动提交）
    ↓
用户浏览器跳转支付宝收银台
    ↓
PC端：扫码支付 或 登录支付宝账号支付
    ↓
支付成功 → 支付宝同步跳回我们的网站（return_url）
        → 支付宝异步通知后端（notify_url）
    ↓
后端验签 → 更新订单状态 → 用户跳转到订单详情/下载页
```

## 3.2 支付宝 vs 微信支付对比

| 维度 | 微信支付 | 支付宝 |
|------|---------|--------|
| 商户审核 | 严格（需30天+运营数据） | **宽松**（1-3 工作日） |
| API 复杂度 | V3 需 RSA/AES 双加密 + 证书管理 | **简单**（RSA 签名即可） |
| SDK | 无官方 Node.js SDK | **有官方 SDK** (`alipay-sdk`) |
| PC 支付方式 | Native 扫码 | **电脑网站支付**（扫码 + 账号密码双模式） |
| 文档质量 | 一般 | 清晰 |
| 费用 | 0.6% | 0.6% |

## 3.3 后端实现

### 支付宝配置

```bash
# .env
ALIPAY_APP_ID=2021xxxxxxxxxxxx
ALIPAY_PRIVATE_KEY=MIIEvgIBADANBgkq...      # 应用私钥（我们自己生成）
ALIPAY_PUBLIC_KEY=MIIBIjANBgkq...           # 支付宝公钥（支付宝提供）
ALIPAY_NOTIFY_URL=https://我们的域名.com/v1/payment/alipay/callback
ALIPAY_RETURN_URL=https://我们的域名.com/orders
```

### 支付宝客户端

```typescript
// payment/providers/alipay.provider.ts
import AlipaySdk from 'alipay-sdk';

@Injectable()
export class AlipayProvider implements PaymentProvider {
    readonly name = 'alipay';
    readonly displayName = '支付宝';

    async createPayment(order: OrderEntity): Promise<PaymentResult> {
        const alipay = new AlipaySdk({ ... });
        const result = alipay.pageExec('alipay.trade.page.pay', {
            bizContent: {
                out_trade_no: order.outTradeNo,
                total_amount: (order.amount / 100).toFixed(2),
                subject: order.paperTitle,
                product_code: 'FAST_INSTANT_TRADE_PAY',
            },
            return_url: config.alipayReturnUrl,
            notify_url: config.alipayNotifyUrl,
        });
        return { provider: 'alipay', payForm: result }; // HTML 表单字符串
    }

    async verifyCallback(data: any): Promise<CallbackResult> {
        const ok = alipay.checkNotifySign(data);
        if (!ok) throw new BadRequestException('签名验证失败');
        return { success: true, outTradeNo: data.out_trade_no, transactionId: data.trade_no, amount: ... };
    }
}
```

### 支付实体

```sql
ALTER TABLE "payment"
    RENAME COLUMN "wx_transaction_id" TO "transaction_id",
    RENAME COLUMN "wx_out_trade_no" TO "out_trade_no",
    ADD COLUMN "provider" VARCHAR(16) NOT NULL DEFAULT 'alipay';
```

## 3.4 支付宝商户申请

| 事项 | 说明 |
|------|------|
| 入口 | [b.alipay.com](https://b.alipay.com) → 注册企业账户 |
| 材料 | 营业执照 + 法人身份证 + 对公账户 |
| 费用 | **免费**（签约电脑网站支付不收接入费） |
| 审核 | 1-3 个工作日 |
| 费率 | 0.6%（和微信一样） |

---

# 四、PC 端顶部导航 UI 布局

## 4.1 整体布局

```
┌──────────────────────────────────────────────────────────────────┐
│  顶部导航栏 (fixed, 100%宽, 蓝色背景 #1a6fb5)                       │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │  🤖 AI智能组卷    首页  AI组卷  我的订单  个人中心  │    👤 张老师 ▾ │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  <main class="container" style="max-width:1200px; margin:0 auto">│
│                                                                  │
│     [面包屑导航]                                                   │
│                                                                  │
│     [页面内容区]                                                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Footer: © 2026 AI智能组卷 | ICP备案号 | 联系我们                   │
└──────────────────────────────────────────────────────────────────┘
```

## 4.2 导航栏结构

**教师端**：首页 | AI组卷 | 我的订单 | 个人中心  
**管理员**：首页 | AI组卷 | 我的订单 | 管理后台 ▾ | 个人中心

管理后台下拉菜单：仪表盘 · 题库管理 · 入库审核 · 文件上传 · 知识点中心 · 定价配置 · 订单管理 · 提现管理

## 4.3 管理后台布局

```
┌──────────────────────────────────────────────┐
│  顶部导航栏（始终显示）                         │
├──────────┬───────────────────────────────────┤
│ 侧边栏    │  内容区                            │
│          │                                   │
│ 📊 仪表盘 │  ┌─────────────────────────────┐ │
│ 📤 上传   │  │                             │ │
│ ✅ 审核   │  │   内容...                     │ │
│ 📚 题库   │  │                             │ │
│ 🏷️ 知识点 │  └─────────────────────────────┘ │
│ 💰 定价   │                                   │
│ 📦 订单   │                                   │
│ 💳 提现   │                                   │
└──────────┴───────────────────────────────────┘
```

---

# 五、技术栈

## 5.1 前端

| 层 | 技术 |
|---|------|
| 框架 | Vue 3.4 + TypeScript + Composition API |
| 构建 | Vite 5 + @vitejs/plugin-vue |
| 路由 | Vue Router 4 |
| 状态管理 | Pinia |
| HTTP | axios |
| UI 组件库 | Element Plus |
| 图表 | ECharts (仪表盘) |
| CSS | SCSS + CSS 变量 + px 单位 |
| 二维码展示 | qrcode (支付页面展示支付宝扫码) |

## 5.2 后端

| 层 | 技术 |
|---|------|
| 框架 | NestJS + TypeScript |
| ORM | TypeORM |
| 数据库 | PostgreSQL + pgvector (生产) / SQLite (本地开发) |
| 缓存 | Redis (短信验证码存储 + 频率限制) |
| 短信 | 阿里云 Dysmsapi SDK |
| 支付 | alipay-sdk (支付宝官方 Node.js SDK) |
| 导出 | Python (Flask + python-docx + LibreOffice) |
| 存储 | 腾讯云 COS |

---

# 六、前端改造映射表（精简版）

## 6.1 API 替换

| UniApp | Web |
|--------|-----|
| `uni.request` | `axios` |
| `uni.login` | `POST /v1/auth/send-sms` + `POST /v1/auth/login` |
| `uni.requestPayment` | 提交支付宝表单 → 跳转收银台 |
| `uni.uploadFile` | `axios.post(url, formData)` |
| `uni.downloadFile` | `window.open(url)` |
| `uni.setStorageSync` / `getStorageSync` / `removeStorageSync` | `localStorage` |
| `uni.navigateTo` / `redirectTo` / `switchTab` / `reLaunch` | `router.push` / `router.replace` |
| `uni.navigateBack` | `router.back` |
| `uni.showToast` | `ElMessage` |
| `uni.showModal` | `ElMessageBox` |
| `uni.$emit` / `uni.$on` | `mitt` |

## 6.2 组件替换

| UniApp | Web |
|--------|-----|
| `<view>` | `<div>` |
| `<text>` | `<span>` / `<p>` |
| `<button>` | `<el-button>` |
| `<input>` | `<el-input>` |
| `<textarea>` | `<el-input type="textarea">` |
| `<slider>` | `<el-slider>` |
| `<switch>` | `<el-switch>` |
| `<picker>` | `<el-select>` |

## 6.3 其他清理

- `@tap` → `@click`（82 处）
- `rpx` → `px`（数值 ÷ 2，全局替换）
- `#ifdef` / `#ifndef` → 全部删除
- `onLoad` / `onShow` / `onLaunch` → Vue Router hooks + Vue 生命周期
- `pages.json` → `router/index.ts`
- `manifest.json` → 删除
- `@dcloudio/*` → 全部卸载

---

# 七、前后端改造量汇总

## 7.1 前端

| 类别 | 规模 |
|------|------|
| 新建文件 | ~35 个（项目骨架 + 布局 + 26 页面 + API + Store） |
| 废弃文件 | ~45 个（整个旧 `frontend/` 归档为 `frontend-legacy/`） |
| 代码行数（估算） | 新项目 ~8000 行 |

## 7.2 后端

| 类别 | 文件 | 改动 |
|------|------|------|
| 短信验证码登录 | `auth.service.ts`, `auth.controller.ts`, `sms.service.ts` 🆕 | ~80 行新增 |
| 支付宝支付 | `payment/providers/alipay.provider.ts` 🆕, `payment.service.ts` ✏️ | ~150 行新增 |
| 用户实体 | `user.entity.ts` ✏️ | +phone 字段 |
| 数据库迁移 | `003_web_migration.sql` 🆕 | ~20 行 |
| 配置 | `configuration.ts` ✏️, `.env` ✏️ | +阿里云/支付宝配置 |
| 旧微信支付代码 | `wxpay.client.ts` | 📦 保留不动（未来可能多通道） |
| 测试适配 | ~7 文件 | spec 更新 |

**后端改动量远小于前端**：核心业务逻辑（AI 管线、导出、审核、题库）全部不动。

---

# 八、项目文件结构

```
项目根/
├── frontend-legacy/              # 📦 旧 UniApp 项目（只读归档）
├── frontend-web/                 # 🆕 新 Web 项目
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── src/
│   │   ├── main.ts
│   │   ├── App.vue
│   │   ├── router/index.ts
│   │   ├── api/
│   │   │   ├── index.ts              # axios 实例 + 拦截器
│   │   │   └── modules/
│   │   │       ├── auth.ts
│   │   │       ├── paper.ts
│   │   │       ├── order.ts
│   │   │       ├── payment.ts
│   │   │       └── admin.ts
│   │   ├── stores/
│   │   │   ├── auth.ts
│   │   │   ├── paper.ts
│   │   │   └── order.ts
│   │   ├── layouts/
│   │   │   ├── DefaultLayout.vue     # TopNav + Content + Footer
│   │   │   └── AdminLayout.vue       # TopNav + Sidebar + Content
│   │   ├── components/
│   │   │   ├── TopNav.vue
│   │   │   ├── AdminSidebar.vue
│   │   │   ├── SmsLogin.vue          # 🆕 短信登录组件
│   │   │   └── QuestionCard.vue
│   │   ├── pages/
│   │   │   ├── index/                 # 首页
│   │   │   ├── login/                 # 短信验证码登录页
│   │   │   ├── paper/config/          # 组卷配置
│   │   │   ├── paper/preview/         # 试卷预览
│   │   │   ├── payment/               # 支付确认 + 支付宝跳转
│   │   │   ├── orders/                # 订单列表
│   │   │   ├── orders/detail/         # 订单详情
│   │   │   ├── profile/               # 个人中心
│   │   │   ├── profile/balance/       # 余额
│   │   │   ├── profile/withdraw/      # 提现
│   │   │   ├── contribute/            # 教师贡献
│   │   │   ├── print/checkout/        # 打印结算
│   │   │   ├── address/list/          # 地址列表
│   │   │   ├── address/edit/          # 地址编辑
│   │   │   └── admin/                 # 管理后台
│   │   │       ├── dashboard/
│   │   │       ├── upload/
│   │   │       ├── review/
│   │   │       ├── questions/
│   │   │       ├── knowledge/
│   │   │       ├── pricing/
│   │   │       ├── orders/
│   │   │       └── withdrawals/
│   │   └── styles/
│   │       ├── variables.scss
│   │       ├── reset.scss
│   │       └── global.scss
│   └── public/
│       └── favicon.ico
├── backend/                       # 后端（少量改动）
├── export-service/                # 导出服务（不动）
└── doc/                           # 文档中心
    ├── 03_Design/
    │   └── Web_Migration_Blueprint.md  # 本文档
    └── 04_Development/
        ├── Task_01_Frontend_Infrastructure.md   # 🆕 任务文档
        ├── Task_02_Frontend_Pages.md            # 🆕 任务文档
        ├── Task_03_Backend_Auth_Payment.md      # 🆕 任务文档
        └── Task_04_Integration_Deploy.md         # 🆕 任务文档
```

---

# 九、工时汇总

| Phase | 内容 | 工时 |
|-------|------|------|
| Phase 1 | 前端基础设施（项目骨架+路由+布局+登录+API） | 2d |
| Phase 2 | 前端页面迁移（教师端 16 页 + 管理后台 10 页） | 4d |
| Phase 3 | 后端改造（短信登录 + 支付宝支付 + 数据库迁移） | 2d |
| Phase 4 | 联调测试 + 部署 | 1.5d |
| Phase 5 | UI 美化 | 持续 P2 |
| **P0 合计** | | **9.5 天** |

---

# 十、外部依赖与甲方待办

| 事项 | 谁做 | 耗时 | 阻塞 |
|------|------|------|------|
| 阿里云短信服务开通 + 签名/模板审核 | 甲方 | 1-2 天 | 短信登录 |
| 支付宝商户入驻 | 甲方 | 1-3 天 | 支付 |
| 支付宝应用创建 + 密钥配置 | 我们 | 0.5 天 | — |
| ICP 备案 | ✅ 已完成 | — | — |
| SSL 证书 | ✅ 已完成 | — | — |
| 域名解析 | ✅ 已完成 | — | — |
| 服务器 | ✅ 已完成 | — | — |

> **与微信方案对比**：原需 300 元 + 1-2 周审核 + 一堆材料。现在只需要让甲方去支付宝和阿里云官网点几下就行，都是标准化流程，不需要额外材料。

---

> **结论**：不跟微信打交道，用短信登录 + 支付宝支付，开发量基本持平，但甲方侧的外部依赖从"地狱模式"变成"注册个账号就行"。核心 P0 工时约 9.5 天。
