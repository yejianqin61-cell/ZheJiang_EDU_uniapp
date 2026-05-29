# Payment Module — 支付模块

Version 1.0 | 2026-05-29

---

## 模块职责

负责微信支付集成：统一下单、唤起支付、回调验签、支付状态同步。按次付费，单价由后台系统配置。

---

## 功能列表

| ID | 功能 | 描述 |
|----|------|------|
| PM-01 | 统一下单 | 调用微信支付统一下单API，生成预支付订单，返回小程序支付参数 |
| PM-02 | 唤起支付 | 前端使用wx.requestPayment发起支付 |
| PM-03 | 支付回调 | 接收微信支付异步通知，验签后更新订单和试卷状态 |
| PM-04 | 支付状态查询 | 前端轮询或主动查询支付结果 |
| PM-05 | 签名验证 | 回调数据RSA/SM2签名校验，防止伪造通知 |

---

## 前端页面

| 页面 | 路由 | 描述 |
|------|------|------|
| 支付确认 | `/pages/payment/index` | 展示订单金额，点击"支付"唤起微信收银台 |

---

## 后端服务

| 服务 | 职责 |
|------|------|
| `PaymentService` | 统一下单、签名生成、回调处理、状态同步 |
| `WxPayClient` | 封装微信支付API v3（HTTP签名、证书管理） |

---

## 数据表

| 表 | 用途 |
|---|------|
| `payment` | 支付记录表（order_id, wx_transaction_id, wx_out_trade_no, amount, status, callback_raw） |
| `order` | 订单表（支付成功后更新status→paid, paid_at） |
| `paper` | 试卷表（支付成功后更新status→paid） |

---

## API

| Method | Endpoint | Auth | 描述 |
|--------|----------|------|------|
| POST | `/v1/orders` | JWT | 创建订单并发起支付（返回wxPayParams） |
| POST | `/v1/orders/callback` | Public | 微信支付异步回调通知（签名验证，非JWT） |
| GET | `/v1/orders/{orderId}/payment-status` | JWT | 查询支付状态 |

### POST /v1/orders

```
Request:  { "paperId": "uuid" }
Response:
{
  "orderId": "uuid",
  "orderNo": "20260529123456789012",
  "amount": 500,
  "wxPayParams": {
    "timeStamp": "1717000000",
    "nonceStr": "abc...",
    "package": "prepay_id=wx...",
    "signType": "RSA",
    "paySign": "sign..."
  }
}
```

### POST /v1/orders/callback

```
处理流程:
1. 验证请求签名（微信支付公钥）
2. 解密回调数据
3. 更新 payment.status = success + wx_transaction_id
4. 更新 order.status = paid + paid_at
5. 更新 paper.status = paid
6. 返回 200 OK（微信侧确认接收）
```

---

## 状态流转

```
┌─────────┐
│ CREATED  │  ← POST /orders 调用微信统一下单后
└────┬────┘
     │
     ├── 用户支付成功 → 微信回调
     │    │
     │    ▼
     │  ┌─────────┐
     │  │ SUCCESS  │  → order.paid → paper.paid → 解锁导出
     │  └─────────┘
     │
     ├── 用户取消支付 → order.status = CANCELLED
     │
     └── 支付超时（30分钟） → order.status = CANCELLED
```

### 支付安全约束

| 规则 | 说明 |
|------|------|
| 签名验证 | 回调必须验签，验签失败返回400，不处理业务 |
| 金额校验 | 回调金额需与订单金额一致 |
| 重复通知 | 通过wx_transaction_id去重，已处理的回调直接返回200 |
| 订单状态校验 | 仅pending状态订单可被标记为paid |
