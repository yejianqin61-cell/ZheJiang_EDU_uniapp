# Print & Pricing Module — 打印服务 + 定价配置模块

Version 2.1 | 2026-06-08

---

# 一、需求概述

在现有"组卷 → 支付 → 下载"流程基础上，新增**打印服务**模式，并配套**管理员定价配置**。

## 1.1 两种服务模式（组卷后分流）

```
┌──────────────────────────────────────────────────────────────────┐
│                        组卷 → 试卷预览                            │
│                              │                                   │
│                              ▼                                   │
│                    ┌─────────────────┐                           │
│                    │  选择服务模式    │  🆕 分流页                 │
│                    └────┬────────┬───┘                           │
│                         │        │                               │
│              ┌──────────┘        └──────────┐                    │
│              ▼                              ▼                    │
│     ┌────────────────┐             ┌────────────────┐           │
│     │  下载服务       │             │  打印服务       │           │
│     │  (现有流程)     │             │  (新增)         │           │
│     ├────────────────┤             ├────────────────┤           │
│     │ 支付 → 下载文件 │             │ 选份数+填地址   │           │
│     │ 获得 DOCX/PDF  │             │ → 支付          │           │
│     │ 自行打印       │             │ → 等待送货上门   │           │
│     └────────────────┘             └────────────────┘           │
└──────────────────────────────────────────────────────────────────┘
```

## 1.2 定价模型

| 模式 | 定价方式 | 配置者 |
|------|---------|--------|
| 下载服务 | **按题计费**：`单题价格 × 题目数量` | 管理员设单题价格 |
| 打印服务 | **分档计费**：份数落入某档，按该档单价 × 份数 | 管理员设三档（份数范围+单价） |

## 1.3 订单列表 — Tab 双栏结构

### 用户端订单页

```
┌──────────────────────────────────────────┐
│           我的订单                        │
├──────────────────────────────────────────┤
│     [ 下载服务 ]    [ 打印服务 ]          │  ← Tab 切换
├──────────────────────────────────────────┤
│                                          │
│  下载 Tab：                               │
│    · 所有下载类型订单列表                  │
│    · 已支付订单显示「下载」按钮            │
│    · 复用现有下载逻辑                     │
│                                          │
│  打印 Tab：                               │
│    · 所有打印类型订单列表                  │
│    · 点击进入详情                         │
│    · 详情显示：时间、金额、收货地址、份数   │
│    · 物流状态追踪                         │
│                                          │
└──────────────────────────────────────────┘
```

### 管理员端订单页

```
┌──────────────────────────────────────────────────┐
│           订单管理                                │
├──────────────────────────────────────────────────┤
│  查看范围:  [ 我的订单 ]  [ 所有用户订单 ]        │  ← 范围筛选
├──────────────────────────────────────────────────┤
│            [ 下载服务 ]  [ 打印服务 ]              │  ← Tab 切换
├──────────────────────────────────────────────────┤
│                                                  │
│  下载 Tab：                                       │
│    · 范围=我的：同用户端，可下载                   │
│    · 范围=所有用户：只读查看，无下载按钮            │
│                                                  │
│  打印 Tab：                                       │
│    · 范围=我的：同用户端，含物流状态               │
│    · 范围=所有用户：可更新 print_status             │
│      (标记打印中 / 已发货 / 已签收)               │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

# 二、数据库设计

## 2.1 新增表

### `shipping_address` — 收货地址表

```sql
CREATE TABLE "shipping_address" (
    "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id"       UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "receiver_name" VARCHAR(32) NOT NULL,              -- 收货人姓名
    "phone"         VARCHAR(20) NOT NULL,              -- 联系电话
    "province"      VARCHAR(32) NOT NULL,              -- 省
    "city"          VARCHAR(32) NOT NULL,              -- 市
    "district"      VARCHAR(32) NOT NULL,              -- 区/县
    "detail"        VARCHAR(256) NOT NULL,             -- 详细地址（街道/门牌号）
    "is_default"    BOOLEAN NOT NULL DEFAULT FALSE,    -- 是否默认地址
    "created_at"    TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at"    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addr_user ON "shipping_address"("user_id");
```

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK→user | 所属用户 |
| receiver_name | VARCHAR(32) | 收货人姓名 |
| phone | VARCHAR(20) | 联系电话 |
| province | VARCHAR(32) | 省 |
| city | VARCHAR(32) | 市 |
| district | VARCHAR(32) | 区 |
| detail | VARCHAR(256) | 详细地址 |
| is_default | BOOLEAN | 默认地址标记 |
| created_at / updated_at | TIMESTAMP | |

---

### `pricing_config` — 定价配置表

```sql
CREATE TABLE "pricing_config" (
    "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "type"          VARCHAR(16) NOT NULL,              -- 'download' | 'print'
    "tier"          SMALLINT NOT NULL DEFAULT 1,       -- 档位编号（下载=1，打印=1/2/3）
    "min_quantity"  INTEGER,                           -- 最小份数（打印模式用，下载为 NULL）
    "max_quantity"  INTEGER,                           -- 最大份数（打印模式用，下载为 NULL；NULL 表示上不封顶）
    "unit_price"    INTEGER NOT NULL,                  -- 单价（单位：分）
    "updated_by"    UUID REFERENCES "user"("id"),      -- 最后修改人
    "created_at"    TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at"    TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE ("type", "tier")
);

-- 种子数据：默认定价
INSERT INTO pricing_config (type, tier, min_quantity, max_quantity, unit_price) VALUES
    ('download', 1, NULL, NULL, 200),   -- 下载模式：¥2.00 / 题
    ('print',    1, 1,    10,   500),   -- 1-10份：  ¥5.00 / 份
    ('print',    2, 11,   50,   400),   -- 11-50份： ¥4.00 / 份
    ('print',    3, 51,   NULL, 300);   -- 51份以上：¥3.00 / 份
```

| Column | Type | Description |
|--------|------|-------------|
| type | VARCHAR(16) | 定价类型：download / print |
| tier | SMALLINT | 档位编号 |
| min_quantity | INTEGER nullable | 该档最低份数 |
| max_quantity | INTEGER nullable | 该档最高份数（NULL = 无上限） |
| unit_price | INTEGER | 单价（分） |
| updated_by | UUID | 修改人 |
| UNIQUE(type, tier) | — | 每种类型每档唯一 |

---

## 2.2 修改现有表

### `order` 表新增字段

```sql
ALTER TABLE "order"
    ADD COLUMN "type"                      VARCHAR(16) NOT NULL DEFAULT 'download',
    -- 'download' | 'print'

    ADD COLUMN "copies"                    INTEGER,
    -- 打印份数（仅 print 订单；NULL 表示不适用）

    ADD COLUMN "shipping_address_id"       UUID REFERENCES "shipping_address"("id"),
    -- 收货地址 ID

    ADD COLUMN "shipping_snapshot"         JSONB,
    -- 下单时收货地址快照
    -- { receiverName, phone, province, city, district, detail }

    ADD COLUMN "pricing_snapshot"          JSONB,
    -- 下单时定价快照
    -- 下载: { type: 'download', unitPrice: 200, questionCount: 20, total: 4000 }
    -- 打印: { type: 'print', tier: 2, unitPrice: 400, copies: 30, total: 12000 }

    ADD COLUMN "unit_price"                INTEGER NOT NULL DEFAULT 0,
    -- 实际应用的单价（分）：下载=每题价格，打印=每份价格

    ADD COLUMN "print_status"              VARCHAR(32),
    -- 打印订单物流状态（仅 print 订单，共三种状态）：
    -- NULL（支付后待处理）→ printing → shipped → delivered
    -- download 订单始终为 NULL
    ;

CREATE INDEX idx_order_type ON "order"("type");
CREATE INDEX idx_order_print_status ON "order"("print_status") WHERE "type" = 'print';
```

---

### `paper` 表 — 无需修改

试卷自身不区分下载/打印，生成后由分流页选择服务模式。

---

## 2.3 ERD 增量

```
                         ┌────────────────────┐
                         │   pricing_config   │  🆕
                         ├────────────────────┤
                         │ type (download/prt)│
                         │ tier (1/2/3)       │
                         │ min_quantity       │
                         │ max_quantity       │
                         │ unit_price (分)    │
                         └────────────────────┘

┌──────────┐    ┌──────────────┐    ┌───────────────────┐
│   user   │    │    order     │    │ shipping_address  │  🆕
├──────────┤    ├──────────────┤    ├───────────────────┤
│ id       │───▶│ user_id      │    │ id                │
│ ...      │    │ type 🆕      │◀───│ user_id           │
└──────────┘    │ copies 🆕    │    │ receiver_name     │
                │ unit_price 🆕│    │ phone             │
                │ pricing_snp🆕│    │ province          │
                │ shipping_snp🆕    │ city              │
                │ print_status🆕    │ district          │
                │ amount       │    │ detail            │
                │ status       │    │ is_default        │
                └──────────────┘    └───────────────────┘
```

---

# 三、定价计算逻辑

## 3.1 下载模式

```
total = unit_price_download × question_count

示例:
  单题价格 = 200分 (¥2.00)
  题目数   = 20题
  总价     = 200 × 20 = 4000分 = ¥40.00
```

## 3.2 打印模式（分档计费）

```
匹配规则: 按 copies 找到所属档位 (min ≤ copies ≤ max)，取该档 unit_price

total = unit_price × copies

示例:
  档位配置:  1-10份 ¥5.00  |  11-50份 ¥4.00  |  51份+ ¥3.00
  用户选 30份 → 落入第2档 → unit_price = ¥4.00
  总价 = 30 × 400 = 12000分 = ¥120.00
```

```
┌──────────────────────────────────────────────────────┐
│                    分档计费示意                       │
│                                                      │
│  单价 ¥5 ┤████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│          │ 1-10份                                    │
│          │                                           │
│  单价 ¥4 ┤          ████████████████████░░░░░░░░░░   │
│          │          11-50份                          │
│          │                                           │
│  单价 ¥3 ┤                              ██████████   │
│          │                              51份以上      │
│          └─────────────────────────────────────────   │
│           10        30        50                     │
└──────────────────────────────────────────────────────┘
```

---

# 四、API 设计

## 4.1 收货地址 API

### `GET /v1/shipping-addresses`

获取当前用户的收货地址列表。

```
Auth: JWT (teacher / admin)
Response:
{
  "code": 0,
  "data": [
    {
      "id": "uuid",
      "receiverName": "张三",
      "phone": "13800138000",
      "province": "浙江省",
      "city": "杭州市",
      "district": "西湖区",
      "detail": "文三路 138 号浙大西溪校区",
      "isDefault": true
    }
  ]
}
```

### `POST /v1/shipping-addresses`

新增收货地址。若设为默认，自动取消其他地址的默认标记。

```
Auth: JWT
Request:
{
  "receiverName": "张三",
  "phone": "13800138000",
  "province": "浙江省",
  "city": "杭州市",
  "district": "西湖区",
  "detail": "文三路 138 号浙大西溪校区",
  "isDefault": true
}
Response: { "code": 0, "data": { "id": "uuid" } }
```

### `PUT /v1/shipping-addresses/:id`

修改地址。仅允许修改本人的地址。

```
Auth: JWT
Request: (同 create，字段均可选)
Response: { "code": 0 }
```

### `DELETE /v1/shipping-addresses/:id`

删除地址。仅允许删除本人的地址。

```
Auth: JWT
Response: { "code": 0 }
```

**约束**：每个用户最多 10 个地址。

---

## 4.2 订单 API

### `POST /v1/orders` — 扩展

原有 download 模式不变，新增 print 模式参数：

```
Auth: JWT

// 模式一：下载（现有，兼容）
Request: { "paperId": "uuid", "type": "download" }

// 模式二：打印（新增）
Request: {
  "paperId": "uuid",
  "type": "print",
  "copies": 30,
  "shippingAddressId": "uuid"
}

Response (两种模式统一):
{
  "code": 0,
  "data": {
    "orderId": "uuid",
    "orderNo": "20260608...",
    "type": "print",
    "amount": 12000,              // 总价（分）
    "unitPrice": 400,             // 实际单价
    "copies": 30,                 // 打印份数（download=null）
    "pricingDetail": {            // 定价明细
      "type": "print",
      "tier": 2,
      "unitPrice": 400,
      "copies": 30,
      "total": 12000
    },
    "wxPayParams": { ... }
  }
}
```

**校验规则**：
- `type=print` 时 `copies` 必填（≥1），`shippingAddressId` 必填且属于当前用户
- `type=download` 时不需要 `copies` 和 `shippingAddressId`
- 一份试卷同时只能有一个 pending 状态的同类型订单（防重复下单）

---

### `GET /v1/orders` — 扩展（用户端 + 管理员端统一入口）

支持 `type` 和 `scope` 双维度筛选。

```
Auth: JWT

参数:
  type   : 'download' | 'print'           — Tab 筛选（不传返回全部）
  scope  : 'mine' | 'others'              — 范围筛选（仅 admin 可用；teacher 始终 mine）
  page   : number
  pageSize: number
  status : 'pending' | 'paid' | ...       — 可选状态筛选

// 普通教师调用（始终仅查看自己的）
GET /v1/orders?type=download&page=1&pageSize=20
GET /v1/orders?type=print&page=1&pageSize=20

// 管理员调用
GET /v1/orders?scope=mine&type=download&page=1        — 我的下载订单
GET /v1/orders?scope=others&type=print&page=1          — 所有用户的打印订单（除自己）
GET /v1/orders?scope=others&type=download&page=1       — 所有用户的下载订单（除自己）
```

**权限校验**：
- `scope=others` 仅 admin 角色可用，teacher 使用此参数返回 403
- teacher 不传 scope 时默认强制 `scope=mine`
- admin 不传 scope 时默认 `scope=mine`

**Response（统一）**：

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "orderId": "uuid",
        "orderNo": "20260608123456789012",
        "type": "print",
        "paperTitle": "五年级数学单元练习卷",
        "questionCount": 20,
        "amount": 12000,
        "unitPrice": 400,
        "copies": 30,
        "status": "paid",
        "printStatus": "paid",
        "shipping": {
          "receiverName": "张三",
          "phone": "138****8000",
          "fullAddress": "浙江省杭州市西湖区文三路138号"
        },
        "userName": "张老师",
        "createdAt": "2026-06-08T10:00:00Z"
      },
      {
        "orderId": "uuid2",
        "orderNo": "20260607123456789012",
        "type": "download",
        "paperTitle": "三年级数学单元测试",
        "amount": 1000,
        "status": "paid",
        "hasExport": true,
        "createdAt": "2026-06-07T09:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

> **注意**：当 `scope=others` 时，download 订单**不返回** `hasExport` 和下载链接（管理员不可下载他人试卷，数据隐私）。print 订单的手机号做脱敏处理。

---

### `GET /v1/orders/:id` — 订单详情

```
Auth: JWT (仅订单归属人或 admin 可查看)

Response (download 订单):
{
  "orderId": "uuid",
  "orderNo": "...",
  "type": "download",
  "paperTitle": "五年级数学单元练习卷",
  "questionCount": 20,
  "amount": 4000,
  "unitPrice": 200,
  "status": "paid",
  "pricingSnapshot": { "type": "download", "unitPrice": 200, "questionCount": 20, "total": 4000 },
  "hasExport": true,
  "createdAt": "2026-06-08T10:00:00Z",
  "paidAt": "2026-06-08T10:01:00Z"
}

Response (print 订单):
{
  "orderId": "uuid",
  "orderNo": "...",
  "type": "print",
  "paperTitle": "五年级数学单元练习卷",
  "questionCount": 20,
  "amount": 12000,
  "unitPrice": 400,
  "copies": 30,
  "status": "paid",
  "printStatus": "printing",
  "pricingSnapshot": {
    "type": "print", "tier": 2, "unitPrice": 400, "copies": 30, "total": 12000
  },
  "shipping": {
    "receiverName": "张三",
    "phone": "138****8000",
    "fullAddress": "浙江省杭州市西湖区文三路138号"
  },
  "printStatusLog": [                          // 物流状态时间线
    { "status": "printing",  "time": "2026-06-08T11:00:00Z" },
    { "status": "shipped",   "time": "2026-06-08T15:00:00Z" }
  ],
  "createdAt": "2026-06-08T10:00:00Z",
  "paidAt": "2026-06-08T10:01:00Z"
}
```

---

### `PUT /v1/admin/orders/:id/print-status` — 更新打印物流状态（管理员）

仅 admin 可调用，仅对 `type=print` 的订单有效。

```
Auth: JWT (admin)
Request: { "printStatus": "shipped" }
Response: { "code": 0 }
```

**状态流转校验**：
- `null`（支付后待处理）→ `printing`（管理员触发，开启物流）
- `printing` → `shipped`
- `shipped` → `delivered`
- 仅此三种状态：`printing` / `shipped` / `delivered`
- 禁止跳级变更（如 null → shipped）

---

## 4.3 定价配置 API（管理员）

### `GET /v1/admin/pricing`

获取当前全部定价配置。

```
Auth: JWT (admin)
Response:
{
  "code": 0,
  "data": {
    "download": {
      "unitPrice": 200,
      "description": "按题计费"
    },
    "print": [
      { "tier": 1, "minQuantity": 1,  "maxQuantity": 10, "unitPrice": 500 },
      { "tier": 2, "minQuantity": 11, "maxQuantity": 50, "unitPrice": 400 },
      { "tier": 3, "minQuantity": 51, "maxQuantity": null, "unitPrice": 300 }
    ]
  }
}
```

### `PUT /v1/admin/pricing`

更新定价配置。`download` 和 `print` 可独立更新。

```
Auth: JWT (admin)
Request:
{
  "download": { "unitPrice": 300 },
  "print": [
    { "tier": 1, "minQuantity": 1,  "maxQuantity": 20, "unitPrice": 600 },
    { "tier": 2, "minQuantity": 21, "maxQuantity": 100,"unitPrice": 450 },
    { "tier": 3, "minQuantity": 101,"maxQuantity": null,"unitPrice": 350 }
  ]
}
Response: { "code": 0 }
```

**校验规则**：
- 档位必须连续覆盖：tier1.min 固定为 1，相邻档位之间 `prev.max + 1 = next.min`
- 末档 `maxQuantity=null`（上不封顶）
- `unitPrice` 必须为正整数（分）

---

## 4.4 公开 API — 获取定价

### `GET /v1/pricing/public`

无需认证，返回当前定价配置。用于前端分流页展示价格。

```
Auth: Public
Response: (同 GET /v1/admin/pricing)
```

---

# 五、状态流转

## 5.1 下载模式（不变）

```
draft (生成试卷) → pending (创建订单) → paid (支付成功) → exported (已导出/可下载)
```

## 5.2 打印模式（新增物流状态）

```
draft (生成试卷)
  │
  ▼
pending (创建订单)
  │
  ▼
paid (支付成功，待处理) ── print_status = null (尚未进入物流)
  │
  │  ← 管理员操作：PUT /admin/orders/:id/print-status { "printStatus": "printing" }
  ▼
printing (打印中)
  │
  │  ← 管理员操作：PUT /admin/orders/:id/print-status { "printStatus": "shipped" }
  ▼
shipped (已发货)
  │
  │  ← 管理员操作：PUT /admin/orders/:id/print-status { "printStatus": "delivered" }
  ▼
delivered (已签收/完成)
```

> **注意**：`print_status` 只有三种状态：`printing`（打印中）、`shipped`（已发货）、`delivered`（已签收）。用户支付成功后 `print_status` 初始为 null，直到管理员第一次操作才进入 `printing`。前端对未开始的打印订单显示「待处理」。

---

# 六、前端设计

## 6.1 分流页 — 试卷预览后选择服务模式 🔥 核心新增

### 方案：在试卷预览页底部增加分流入口

预览页 ([pages/paper/preview/index.vue](frontend/src/pages/paper/preview/index.vue)) 原本只有一个支付按钮。改造后：

```
┌──────────────────────────────────────────────┐
│  📄 五年级数学单元练习卷                       │
│     20题 | 总分100分                          │
├──────────────────────────────────────────────┤
│                                              │
│  第1题  (单选题)                              │
│  题目内容...                                  │
│  A. ...  B. ...  C. ...  D. ...              │
│                                              │
│  ── 前5题免费预览 ──                          │
│  ...                                         │
│                                              │
│  ═══════════════════════════════════════════  │
│  支付后查看完整试卷                            │
│  ═══════════════════════════════════════════  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  📥 下载试卷                            │  │
│  │  支付后可下载 DOCX / PDF                │  │
│  │  ¥2.00/题 × 20题 = ¥40.00             │  │
│  │                              [ 去支付 ] │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  🖨️ 打印并快递                          │  │
│  │  在线支付，我们打印好快递上门            │  │
│  │  ¥4.00~5.00/份，量大优惠               │  │
│  │                              [ 去下单 ] │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

点击「去支付」→ 跳转到下载结算页（现有流程）
点击「去下单」→ 跳转到打印结算页（新增）

---

## 6.2 新增页面

### 打印结算页 — `pages/print/checkout/index.vue` 🆕

```
┌──────────────────────────────────────┐
│  ← 返回    打印服务 — 确认订单        │
├──────────────────────────────────────┤
│                                      │
│  📄 五年级数学单元练习卷 (20题)        │
│                                      │
│  ── 打印份数 ────────────────────    │
│                                      │
│    [  −  ]    30 份    [  +  ]       │
│                                      │
│  ── 分档计费 ────────────────────    │
│  ┌────────────────────────────────┐  │
│  │ 1-10份    ¥5.00 / 份           │  │
│  │ 11-50份   ¥4.00 / 份  ◀ 当前   │  │
│  │ 51份以上  ¥3.00 / 份           │  │
│  └────────────────────────────────┘  │
│                                      │
│  ── 收货地址 ────────────────────    │
│  ┌────────────────────────────────┐  │
│  │ [默认] 张三  138****8000     > │  │
│  │ 浙江省杭州市西湖区文三路138号    │  │
│  └────────────────────────────────┘  │
│  [+ 新增地址]                        │
│                                      │
│  ═══════════════════════════════════  │
│                                      │
│  费用明细:                            │
│    30份 × ¥4.00/份 = ¥120.00        │
│                                      │
│  ┌────────────────────────────────┐  │
│  │        确认支付  ¥120.00        │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### 收货地址列表 — `pages/address/list/index.vue` 🆕

```
┌──────────────────────────────────────┐
│  ← 返回    收货地址管理               │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │ [默认] 张三  138****8000        │  │
│  │ 浙江省杭州市西湖区文三路138号    │  │
│  │               [编辑]  [删除]    │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 李四  139****9000               │  │
│  │ 浙江省宁波市海曙区天一广场1号    │  │
│  │               [编辑]  [删除]    │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌──── + 新增地址 ─────────────────┐ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### 地址编辑 — `pages/address/edit/index.vue` 🆕

```
┌──────────────────────────────────────┐
│  ← 返回    新增地址 / 编辑地址        │
├──────────────────────────────────────┤
│                                      │
│  收货人:    [________________]       │
│  手机号:    [________________]       │
│  所在地区:  [省 ▼] [市 ▼] [区 ▼]     │
│  详细地址:  [________________]       │
│            [________________]       │
│                                      │
│  [✓] 设为默认地址                     │
│                                      │
│  ┌────────── 保存 ─────────────────┐ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
```

---

## 6.3 修改现有页面

### 订单列表 — [pages/orders/index.vue](frontend/src/pages/orders/index.vue) ✏️ 大改

新增顶部 Tab 栏，分流展示下载和打印订单。

```
┌──────────────────────────────────────────┐
│           我的订单                         │
├──────────────────────────────────────────┤
│     [ 下载服务 ]      [ 打印服务 ]        │
├──────────────────────────────────────────┤
│                                          │
│  ┌── Tab: 下载服务 ──────────────────    │
│  │                                       │
│  │  ┌──────────────────────────────┐    │
│  │  │ 📥 下载 | 五年级数学练习卷    │    │
│  │  │ 20题 | ¥40.00 | 已支付       │    │
│  │  │ 2026-06-08 10:00             │    │
│  │  │              [ 下载试卷 ]    │    │
│  │  └──────────────────────────────┘    │
│  │                                       │
│  │  ┌──────────────────────────────┐    │
│  │  │ 📥 下载 | 三年级数学单元测试  │    │
│  │  │ 10题 | ¥20.00 | 已支付       │    │
│  │  │ 2026-06-07 09:00             │    │
│  │  │              [ 下载试卷 ]    │    │
│  │  └──────────────────────────────┘    │
│  │                                       │
│  └───────────────────────────────────────┘
│
│  ┌── Tab: 打印服务 ──────────────────    │
│  │                                       │
│  │  ┌──────────────────────────────┐    │
│  │  │ 🖨️ 打印 | 五年级数学练习卷   │    │
│  │  │ 30份 | ¥120.00 | 打印中      │    │
│  │  │ 收货: 张三 138****8000        │    │
│  │  │ 2026-06-08 10:00          >  │    │
│  │  └──────────────────────────────┘    │
│  │                                       │
│  └───────────────────────────────────────┘
└──────────────────────────────────────────┘
```

**下载 Tab**：复用现有订单逻辑，已支付订单显示「下载」按钮。
**打印 Tab**：显示打印订单摘要（份数、收货人、物流状态），点击进入详情。

---

### 打印订单详情 — [pages/orders/detail/index.vue](frontend/src/pages/orders/detail/index.vue) ✏️ 适配

下载订单详情保持不变。打印订单显示完整信息：

```
┌──────────────────────────────────────────┐
│  ← 返回    订单详情                       │
├──────────────────────────────────────────┤
│                                          │
│  🖨️ 打印服务                             │
│                                          │
│  订单编号: 20260608123456789012           │
│  下单时间: 2026-06-08 10:00              │
│  支付时间: 2026-06-08 10:01              │
│  订单金额: ¥120.00                       │
│                                          │
│  ── 试卷信息 ────────────────────────    │
│  五年级数学单元练习卷 (20题)              │
│                                          │
│  ── 打印信息 ────────────────────────    │
│  打印份数: 30份                          │
│  单价: ¥4.00 / 份 (第2档 11-50份)        │
│                                          │
│  ── 收货地址 ────────────────────────    │
│  收货人: 张三                            │
│  电话: 138****8000                       │
│  地址: 浙江省杭州市西湖区文三路138号      │
│                                          │
│  ── 物流状态 ────────────────────────    │
│  ● 已支付    2026-06-08 10:01            │
│  ● 打印中    2026-06-08 11:00            │
│  ○ 已发货                               │
│  ○ 已签收                               │
│                                          │
└──────────────────────────────────────────┘
```

---

### 管理员定价配置 — `pages/admin/pricing/index.vue` 🆕

```
┌──────────────────────────────────────────┐
│  定价配置                                 │
├──────────────────────────────────────────┤
│                                          │
│  ── 下载服务（按题计费）────────────────  │
│                                          │
│    单题价格: [  2.00  ] 元 / 题          │
│    示例: 20题试卷 = ¥40.00               │
│                                          │
│  ── 打印服务（分档计费）────────────────  │
│                                          │
│    第1档: [  1 ] ~ [  10 ] 份            │
│           单价 [  5.00  ] 元/份          │
│                                          │
│    第2档: [  11 ] ~ [  50 ] 份           │
│           单价 [  4.00  ] 元/份          │
│                                          │
│    第3档: [  51 ] ~ 上不封顶 份          │
│           单价 [  3.00  ] 元/份          │
│                                          │
│  ┌────────── 保存 ─────────────────────┐ │
│  └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

---

### 管理员订单管理 — `pages/admin/orders/index.vue` 🆕 替代原打印订单管理页

统一订单管理页，**范围筛选 + Tab 切换**：

```
┌──────────────────────────────────────────────────┐
│  订单管理                                         │
├──────────────────────────────────────────────────┤
│                                                  │
│  查看范围: [ ● 我的订单 ]   [ ○ 所有用户订单 ]    │  ← 范围筛选
│                                                  │
│         [ 下载服务 ]      [ 打印服务 ]             │  ← Tab 切换
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌── 范围=我的, Tab=下载 ────────────────────    │
│  │   (同用户端下载Tab，可下载，完全复用)           │
│  └────────────────────────────────────────────── │
│                                                  │
│  ┌── 范围=所有用户, Tab=下载 ────────────────    │
│  │  ┌──────────────────────────────────────┐    │
│  │  │ 📥 下载 | 五年级数学练习卷            │    │
│  │  │ 用户: 张老师 | ¥40.00 | 已支付       │    │
│  │  │ 2026-06-08 10:00                    │    │
│  │  │             (只读，无下载按钮)        │    │
│  │  └──────────────────────────────────────┘    │
│  └────────────────────────────────────────────── │
│                                                  │
│  ┌── 范围=所有用户, Tab=打印 ────────────────    │
│  │  ┌──────────────────────────────────────┐    │
│  │  │ 🖨️ 打印 | 五年级数学练习卷           │    │
│  │  │ 用户: 张老师 | 30份 | ¥120.00        │    │
│  │  │ 状态: 待打印 | 2026-06-08 10:00      │    │
│  │  │ 收货: 张三 138****8000            >  │    │
│  │  │          [ 标记打印中 ]              │    │
│  │  └──────────────────────────────────────┘    │
│  │                                              │
│  │  ┌──────────────────────────────────────┐    │
│  │  │ 🖨️ 打印 | 三年级数学单元测试         │    │
│  │  │ 用户: 李老师 | 50份 | ¥200.00        │    │
│  │  │ 状态: 打印中 | 2026-06-07 09:00      │    │
│  │  │ 收货: 李四 139****9000            >  │    │
│  │  │          [ 标记已发货 ]              │    │
│  │  └──────────────────────────────────────┘    │
│  └────────────────────────────────────────────── │
└──────────────────────────────────────────────────┘
```

**范围=我的**：和用户端订单页行为一致，下载 Tab 可下载，打印 Tab 可查看详情。
**范围=所有用户**：下载 Tab 只读无下载按钮（数据隐私），打印 Tab 可查看详情+更新物流状态。

---

### 管理员仪表盘 — [pages/admin/dashboard/index.vue](frontend/src/pages/admin/dashboard/index.vue) ✏️

增加「打印待处理数」统计卡片。

## 6.4 页面变更总览

| 页面 | 操作 | 说明 |
|------|------|------|
| `pages/paper/preview/index.vue` | ✏️ 大改 | 底部改为两个卡片：下载服务 / 打印服务，分流入口 |
| `pages/print/checkout/index.vue` | 🆕 新增 | 打印结算页：份数选择 + 地址选择 + 分档计费展示 |
| `pages/orders/index.vue` | ✏️ 大改 | 增加顶部 Tab [下载服务｜打印服务]，分流展示 |
| `pages/orders/detail/index.vue` | ✏️ 修改 | 打印订单详情：时间/金额/收货地址/份数/物流时间线 |
| `pages/address/list/index.vue` | 🆕 新增 | 收货地址管理列表 |
| `pages/address/edit/index.vue` | 🆕 新增 | 新增/编辑收货地址 |
| `pages/admin/pricing/index.vue` | 🆕 新增 | 定价配置（下载单题价 + 打印三档价） |
| `pages/admin/orders/index.vue` | 🆕 新增 | 订单管理：范围筛选 + Tab 切换 + 物流状态操作 |
| `pages/admin/dashboard/index.vue` | ✏️ 小改 | 增加打印待处理统计卡片 |

---

# 七、后端模块结构

## 7.1 文件清单

```
backend/src/
├── modules/
│   ├── order/
│   │   ├── order.module.ts            ✏️ 修改
│   │   ├── order.controller.ts        ✏️ 修改：增加 scope/type 筛选 + 打印详情
│   │   └── order.service.ts           ✏️ 修改：双模式创建 + scope 查询
│   ├── payment/
│   │   └── payment.service.ts         ✏️ 修改：金额由 order 决定，逻辑不变
│   ├── print/                          🆕 新增模块
│   │   ├── print.module.ts
│   │   ├── services/
│   │   │   ├── shipping-address.service.ts
│   │   │   ├── pricing.service.ts
│   │   │   └── print-order.service.ts  (物流状态流转)
│   │   └── dto/
│   │       ├── create-address.dto.ts
│   │       ├── update-address.dto.ts
│   │       ├── update-pricing.dto.ts
│   │       └── update-print-status.dto.ts
│   └── admin/
│       ├── admin.module.ts            ✏️ 引入 print 服务
│       └── admin.controller.ts        ✏️ 定价 CRUD + 打印状态更新 + 订单管理
├── database/
│   ├── entities/
│   │   ├── shipping-address.entity.ts  🆕
│   │   ├── pricing-config.entity.ts    🆕
│   │   └── order.entity.ts             ✏️ 新增字段
│   └── migrations/
│       └── 002_print_pricing.sql       🆕
```

## 7.2 关键服务 API 对照

| 接口 | 方法 | 服务 |
|------|------|------|
| 用户地址 CRUD | `GET/POST/PUT/DELETE /v1/shipping-addresses` | `ShippingAddressService` |
| 创建订单 (双模式) | `POST /v1/orders` | `OrderService` |
| 订单列表 (type+scope) | `GET /v1/orders` | `OrderService` |
| 订单详情 | `GET /v1/orders/:id` | `OrderService` |
| 更新打印状态 | `PUT /v1/admin/orders/:id/print-status` | `PrintOrderService` |
| 定价配置 CRUD | `GET/PUT /v1/admin/pricing` | `PricingService` |
| 公开定价 | `GET /v1/pricing/public` | `PricingService` |

---

# 八、开发计划

## Phase 1 — 数据库 + 后端核心（1.5 天）

| # | 任务 | 预估 |
|---|------|------|
| 1 | 数据库迁移 `002_print_pricing.sql` | 1h |
| 2 | `shipping_address` entity + CRUD | 2h |
| 3 | `pricing_config` entity + PricingService（含档位校验） | 2h |
| 4 | `Order` entity 扩展 + OrderService（双模式创建、scope 查询） | 2h |
| 5 | 地址/定价/打印状态 API Controller | 1.5h |
| 6 | 单元测试（定价档位 + 地址 CRUD + scope 权限 + 物流流转） | 2h |

## Phase 2 — 前端用户端（2 天）

| # | 任务 | 预估 |
|---|------|------|
| 1 | 预览页分流改造（两个服务卡片） | 2h |
| 2 | 打印结算页 `pages/print/checkout/index.vue` | 3h |
| 3 | 地址列表 `pages/address/list/index.vue` | 1.5h |
| 4 | 地址编辑 `pages/address/edit/index.vue` | 1.5h |
| 5 | 订单列表 Tab 改造（下载/打印双栏） | 2h |
| 6 | 订单详情适配打印（物流时间线） | 1.5h |
| 7 | API 层 + Store 扩展 | 1h |

## Phase 3 — 前端管理端（1.5 天）

| # | 任务 | 预估 |
|---|------|------|
| 1 | 定价配置页 `pages/admin/pricing/index.vue` | 2.5h |
| 2 | 订单管理页 `pages/admin/orders/index.vue`（范围筛选 + Tab + 物流操作） | 4h |
| 3 | 仪表盘增加打印统计 | 0.5h |
| 4 | 快捷入口更新 | 0.5h |

## Phase 4 — 联调 + 测试（0.5 天）

| # | 任务 | 预估 |
|---|------|------|
| 1 | 端到端流程测试（下载/打印双路径） | 1.5h |
| 2 | scope 权限校验测试（管理员维度） | 1h |
| 3 | 定价档位边界测试 | 1h |

---

## 总工期估算：**5.5 天**

```
Phase 1  ██████████░░░░░░░░░░░░  1.5d  数据库 + 后端
Phase 2  █████████████░░░░░░░░░  2.0d  前端用户端（含分流+Tab改造）
Phase 3  ██████████░░░░░░░░░░░░  1.5d  前端管理端（含范围筛选+统一订单页）
Phase 4  ████░░░░░░░░░░░░░░░░░░  0.5d  联调测试
        ──────────────────────
        合计                   5.5d
```

前端工作量增加了 0.5d（预览页分流卡片 + 订单列表 Tab 双栏 + 管理端范围筛选比原设计更复杂）。

---

# 九、风险与注意点

| 风险 | 应对 |
|------|------|
| 定价配置被误改导致金额异常 | 定价修改记入 audit_log，前端变更前二次确认弹窗 |
| 打印订单堆积（admin 未处理） | 仪表盘显示待处理数；超过48小时未处理高亮提醒 |
| 地址快照 vs 实时地址不一致 | 下单时 snapshot 收货地址到 order，即使地址后被删也不影响 |
| 管理员查看他人下载订单的数据隐私 | `scope=others` 时不返回下载链接、答题数据，仅保留订单元信息 |
| scope 权限泄露 | 后端强制校验：teacher 角色 `scope=others` 直接 403 |
| 分档计费校验复杂 | PricingService 独立单元测试覆盖所有档位边界和连续性 |

---

# 十、RBAC 权限增量

| 资源 | teacher | admin |
|------|:-------:|:-----:|
| `shipping-address:self:*` | CRUD | CRUD |
| `order:create:download` | E | E |
| `order:create:print` | E | E |
| `order:self:read` | R | R |
| `order:others:read` | — | R（只读元信息，不暴露答案/下载） |
| `order:print-status:update` | — | U（仅 admin） |
| `pricing:public:read` | R（公开） | R |
| `pricing:admin:write` | — | C/U |

---

> **设计完成。** V2.1 核心改动：
> 1. 组卷预览页 → **分流入口**：两个服务卡片，用户显式选择下载或打印
> 2. 用户订单页 → **Tab 双栏**：下载服务 Tab（含下载按钮）/ 打印服务 Tab（含物流摘要）
> 3. 管理端订单页 → **范围筛选 + Tab**：`我的订单 / 所有用户订单` × `下载服务 / 打印服务`，统一管理入口
> 4. 总工期 5.5 天。
