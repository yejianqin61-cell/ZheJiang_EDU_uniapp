# Order Module — 订单模块

Version 1.0 | 2026-05-29

---

## 模块职责

负责订单的完整生命周期管理：创建订单、状态跟踪、历史查询、重复下载。按OpenID隔离，教师仅可见本人订单。

---

## 功能列表

| ID | 功能 | 描述 |
|----|------|------|
| O-01 | 创建订单 | 基于已生成的试卷创建订单，生成业务单号，记录金额 |
| O-02 | 订单过期自动取消 | pending状态订单创建24小时后自动标记为expired |
| O-03 | 历史订单列表 | 按时间倒序展示本人订单，含日期/试卷标题/金额/状态 |
| O-04 | 订单筛选 | 按科目、时间范围、状态筛选历史订单 |
| O-05 | 重复下载 | 已支付订单支持再次获取导出文件下载链接 |
| O-06 | 订单清理 | 定时任务：pending/cancelled/expired订单创建后1天物理删除 |

---

## 前端页面

| 页面 | 路由 | 描述 |
|------|------|------|
| 历史订单列表 | `/pages/orders/index` | 订单卡片列表，按时间倒序，显示状态标签 |
| 订单详情 | `/pages/orders/detail` | 订单信息 + 试卷标题 + 下载按钮（已支付时可用） |

---

## 后端服务

| 服务 | 职责 |
|------|------|
| `OrderService` | 订单CRUD、状态流转、过期检查、清理调度 |
| `OrderCleanupJob` | Cron定时任务（@daily）：物理删除过期订单及关联数据 |

---

## 数据表

| 表 | 用途 |
|---|------|
| `order` | 订单主表（user_id, paper_id, order_no, amount, status, expired_at） |

---

## API

| Method | Endpoint | Auth | 描述 |
|--------|----------|------|------|
| GET | `/v1/orders?page=&pageSize=&subject=&status=` | JWT | 历史订单列表（仅本人） |
| GET | `/v1/orders/{orderId}/download` | JWT | 重新获取导出文件下载链接（需已支付） |

### GET /v1/orders

```
Response:
{
  "list": [
    {
      "orderId": "uuid",
      "orderNo": "20260529123456789012",
      "paperTitle": "五年级数学综合练习卷",
      "amount": 500,
      "status": "paid",
      "createdAt": "2026-05-29T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 5, "totalPages": 1 }
}
```

---

## 状态流转

```
┌─────────┐
│ PENDING  │  ← POST /orders 创建
└────┬────┘
     │
     ├── 支付成功 → PAID → 可下载
     │
     ├── 30分钟未支付 → CANCELLED（自动取消，可重新下单）
     │
     └── 创建后24小时 → EXPIRED（自动过期）
          │
          ▼
     ┌──────────┐
     │ 物理删除   │  ← Cron Job @daily（创建后1天）
     └──────────┘
```

### 数据清理策略

| 状态 | 清理时机 | 方式 |
|------|---------|------|
| pending / cancelled / expired | 创建后1天 | 物理删除 |
| paid | 永久保留 | 不清理 |
