# 打印服务 + 定价配置模块 — 开发任务计划

Version 1.0 | 2026-06-08

基于 [Print_Module.md](../03_Design/Modules/Print_Module.md) V2.1 设计文档。

---

## 工期总览

```
Phase 1  ██████████░░░░░░░░░░░░  1.5d  数据库 + 后端核心
Phase 2  █████████████░░░░░░░░░  2.0d  前端用户端
Phase 3  ██████████░░░░░░░░░░░░  1.5d  前端管理端
Phase 4  ████░░░░░░░░░░░░░░░░░░  0.5d  联调 + 回归测试
        ──────────────────────
        合计                   5.5d
```

| Phase | 范围 | 工期 | 新增文件 | 修改文件 |
|-------|------|------|---------|---------|
| 1 | 数据库 + 后端 | 1.5d | ~10 | ~4 |
| 2 | 前端用户端 | 2.0d | ~4 | ~3 |
| 3 | 前端管理端 | 1.5d | ~2 | ~2 |
| 4 | 联调测试 | 0.5d | 0 | 少量 |
| **合计** | | **5.5d** | **~16** | **~9** |

---

# Phase 1 — 数据库 + 后端核心

> 目标：数据库迁移完成，所有 API 端点可用，单元测试通过。

---

## Task 1.1 — 数据库迁移

**预估**：1h  
**文件**：`backend/src/database/migrations/002_print_pricing.sql`

### 内容

```sql
-- 1. 新增表
CREATE TABLE "shipping_address" (...);
CREATE TABLE "pricing_config" (...);

-- 2. 修改 order 表
ALTER TABLE "order" ADD COLUMN "type" ...;
ALTER TABLE "order" ADD COLUMN "copies" ...;
ALTER TABLE "order" ADD COLUMN "shipping_address_id" ...;
ALTER TABLE "order" ADD COLUMN "shipping_snapshot" ...;
ALTER TABLE "order" ADD COLUMN "pricing_snapshot" ...;
ALTER TABLE "order" ADD COLUMN "unit_price" ...;
ALTER TABLE "order" ADD COLUMN "print_status" ...;

-- 3. 索引
CREATE INDEX idx_order_type ON "order"("type");
CREATE INDEX idx_order_print_status ON "order"("print_status") WHERE "type" = 'print';

-- 4. 种子数据
INSERT INTO pricing_config (...) VALUES (...);
```

### 验收
- [ ] SQL 文件在 SQLite（dev）中执行无误
- [ ] 种子定价数据可查询
- [ ] order 表新字段默认值正确

---

## Task 1.2 — 新增 Entity

**预估**：1h  
**文件**：
- `backend/src/database/entities/shipping-address.entity.ts` 🆕
- `backend/src/database/entities/pricing-config.entity.ts` 🆕
- `backend/src/database/entities/order.entity.ts` ✏️

### 内容

**`shipping-address.entity.ts`**：
```typescript
@Entity('shipping_address')
export class ShippingAddress {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() user_id: string;
  @Column() receiver_name: string;
  @Column() phone: string;
  @Column() province: string;
  @Column() city: string;
  @Column() district: string;
  @Column() detail: string;
  @Column({ default: false }) is_default: boolean;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
  // relations
  @ManyToOne(() => User) user: User;
}
```

**`pricing-config.entity.ts`**：
```typescript
@Entity('pricing_config')
@Unique(['type', 'tier'])
export class PricingConfig {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() type: 'download' | 'print';
  @Column({ default: 1 }) tier: number;
  @Column({ nullable: true }) min_quantity: number;
  @Column({ nullable: true }) max_quantity: number;
  @Column() unit_price: number;
  @Column({ nullable: true }) updated_by: string;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
```

**`order.entity.ts`** — 新增字段：
```typescript
@Column({ default: 'download' }) type: 'download' | 'print';
@Column({ nullable: true }) copies: number;
@Column({ nullable: true }) shipping_address_id: string;
@Column({ type: 'jsonb', nullable: true }) shipping_snapshot: object;
@Column({ type: 'jsonb', nullable: true }) pricing_snapshot: object;
@Column({ default: 0 }) unit_price: number;
@Column({ nullable: true }) print_status: 'printing' | 'shipped' | 'delivered';
```

### 验收
- [ ] TypeScript 编译无错误
- [ ] Entity 字段类型与 SQL 一致

---

## Task 1.3 — PricingService + 档位校验

**预估**：2h  
**文件**：
- `backend/src/modules/print/services/pricing.service.ts` 🆕
- `backend/src/modules/print/print.module.ts` 🆕

### 方法

| 方法 | 说明 |
|------|------|
| `getPricingConfig()` | 返回全部定价配置（download + print tiers） |
| `getDownloadPrice()` | 返回下载单题价格 |
| `calculatePrintPrice(copies: number)` | 按份数匹配档位，返回 `{ tier, unitPrice, total }` |
| `updatePricing(dto: UpdatePricingDto)` | 更新定价，校验档位连续性 |

### 档位连续性校验逻辑

```typescript
function validatePrintTiers(tiers: PrintTierDto[]): void {
  // 1. 必须正好 3 档
  // 2. tier1.minQuantity 必须为 1
  // 3. tierX.maxQuantity + 1 === tierX+1.minQuantity
  // 4. tier3.maxQuantity 必须为 null（上不封顶）
  // 5. unitPrice 必须为正整数
}
```

### 验收
- [ ] `getPricingConfig()` 返回种子数据
- [ ] `calculatePrintPrice(30)` → tier=2, unitPrice=400, total=12000
- [ ] `calculatePrintPrice(5)` → tier=1, unitPrice=500, total=2500
- [ ] `calculatePrintPrice(100)` → tier=3, unitPrice=300, total=30000
- [ ] `updatePricing` 不连续档位时报错
- [ ] `updatePricing` unitPrice≤0 时报错

---

## Task 1.4 — ShippingAddressService

**预估**：1.5h  
**文件**：
- `backend/src/modules/print/services/shipping-address.service.ts` 🆕

### 方法

| 方法 | 说明 |
|------|------|
| `listByUser(userId)` | 获取用户地址列表，默认地址排前 |
| `getById(id, userId)` | 获取单个地址，校验归属 |
| `create(userId, dto)` | 创建地址，若 isDefault=true 则取消其他默认 |
| `update(id, userId, dto)` | 更新地址，校验归属 |
| `delete(id, userId)` | 删除地址，校验归属 |

### 约束
- 每用户最多 10 个地址
- 设默认时，自动取消其他默认标记
- 归属校验：仅允许操作自己的地址

### 验收
- [ ] 创建地址成功
- [ ] 设默认后旧默认自动取消
- [ ] 超 10 个地址时报错
- [ ] 修改/删除他人地址返回 403
- [ ] 列表按默认优先排序

---

## Task 1.5 — OrderService 扩展

**预估**：2h  
**文件**：
- `backend/src/modules/order/order.service.ts` ✏️

### 改动

**`createOrder()` 扩展**：
```
createDownloadOrder(userId, paperId)       → 现有逻辑 + 设置 type='download'
createPrintOrder(userId, paperId, copies, addressId) → 新增
  ├─ 调用 PricingService.calculatePrintPrice(copies)
  ├─ 获取收货地址并快照到 shipping_snapshot
  ├─ 设置 pricing_snapshot
  └─ 创建订单记录
```

**`getOrders()` 扩展**：
```
getOrders({ userId, type, scope, page, pageSize, status })
  ├─ scope='mine'    → WHERE user_id = userId
  ├─ scope='others'  → WHERE user_id != userId  (需 admin 权限)
  ├─ type='download'  → WHERE type = 'download'
  ├─ type='print'     → WHERE type = 'print'
  └─ 返回 list + pagination
```

**`getOrderDetail()` 扩展**：
- 打印订单额外返回 `shipping_snapshot`、`pricing_snapshot`、`printStatus`、物流时间线
- scope=others 时脱敏手机号、隐藏下载链接

### 验收
- [ ] 创建 download 订单：金额 = 单题价 × 题数
- [ ] 创建 print 订单：金额 = 匹配档位单价 × 份数
- [ ] scope=mine 只返回自己订单
- [ ] scope=others 只返回他人订单（admin only）
- [ ] scope=others 不返回下载链接
- [ ] 手机号脱敏：138****8000
- [ ] type=download 过滤正确
- [ ] type=print 过滤正确

---

## Task 1.6 — Controller 端点

**预估**：2h  
**文件**：
- `backend/src/modules/print/shipping-address.controller.ts` 🆕（或放 order 模块）
- `backend/src/modules/admin/admin.controller.ts` ✏️

### 端点清单

| Method | Endpoint | Controller | Auth |
|--------|----------|-----------|------|
| `GET` | `/v1/shipping-addresses` | AddressController | JWT |
| `POST` | `/v1/shipping-addresses` | AddressController | JWT |
| `PUT` | `/v1/shipping-addresses/:id` | AddressController | JWT |
| `DELETE` | `/v1/shipping-addresses/:id` | AddressController | JWT |
| `POST` | `/v1/orders` (print 参数) | OrderController | JWT |
| `GET` | `/v1/orders?type=&scope=` | OrderController | JWT |
| `GET` | `/v1/orders/:id` | OrderController | JWT |
| `GET` | `/v1/admin/pricing` | AdminController | JWT admin |
| `PUT` | `/v1/admin/pricing` | AdminController | JWT admin |
| `PUT` | `/v1/admin/orders/:id/print-status` | AdminController | JWT admin |
| `GET` | `/v1/pricing/public` | AdminController | Public |

### 验收
- [ ] 所有端点返回统一响应格式 `{ code, message, data }`
- [ ] 权限校验正确（teacher 调 admin 端点返回 403）
- [ ] scope=others 仅 admin 可用
- [ ] print_status 更新校验状态流转合法性

---

## Task 1.7 — 单元测试

**预估**：2h  
**文件**：
- `backend/src/modules/print/services/pricing.service.spec.ts` 🆕
- `backend/src/modules/print/services/shipping-address.service.spec.ts` 🆕
- `backend/src/modules/order/order.service.spec.ts` ✏️（扩展）

### 测试覆盖

**PricingService**：
- [ ] 默认种子数据正确
- [ ] calculatePrintPrice 三档边界值（1, 10, 11, 50, 51, 1000）
- [ ] updatePricing 合法输入
- [ ] updatePricing 档位不连续抛错
- [ ] updatePricing 负价格抛错

**ShippingAddressService**：
- [ ] CRUD 基本流程
- [ ] 默认地址切换
- [ ] 超 10 个限制
- [ ] 跨用户访问拒绝

**OrderService**：
- [ ] 双模式订单创建
- [ ] scope=mine 查询
- [ ] scope=others 查询（admin）
- [ ] 脱敏校验
- [ ] type 过滤

---

# Phase 2 — 前端用户端

> 目标：用户可完整体验"组卷 → 分流 → 打印下单 → 地址管理 → 订单查看"全链路。

---

## Task 2.1 — 预览页分流改造

**预估**：2h  
**文件**：[frontend/src/pages/paper/preview/index.vue](frontend/src/pages/paper/preview/index.vue) ✏️

### 改动

现有底部只有一个支付按钮，改为两个服务卡片：

```
原：
  [ 支付并导出 ]

新：
  ┌── 📥 下载试卷 ────────────────────┐
  │  支付后可下载 DOCX / PDF          │
  │  ¥2.00/题 × 20题 = ¥40.00       │
  │                         [ 去支付 ]│
  └───────────────────────────────────┘

  ┌── 🖨️ 打印并快递 ──────────────────┐
  │  在线支付，我们打印好快递上门       │
  │  ¥4.00~5.00/份，量大优惠          │
  │                         [ 去下单 ]│
  └───────────────────────────────────┘
```

### 数据需求
- 页面 onLoad 时调用 `GET /v1/pricing/public` 获取定价
- 下载卡片展示：`¥X.XX/题 × N题 = ¥总价`
- 打印卡片展示：`¥X.XX~X.XX/份`

### 路由
- 「去支付」→ `/pages/payment/index?paperId=xxx&type=download`
- 「去下单」→ `/pages/print/checkout/index?paperId=xxx`

### 验收
- [ ] 两个服务卡片正常渲染
- [ ] 价格从 API 动态获取
- [ ] 点击「去支付」跳转支付页（现有流程不变）
- [ ] 点击「去下单」跳转打印结算页

---

## Task 2.2 — 打印结算页

**预估**：3h  
**文件**：[frontend/src/pages/print/checkout/index.vue](frontend/src/pages/print/checkout/index.vue) 🆕

### 页面结构

```
┌──────────────────────────────────────┐
│  ← 返回    打印服务 — 确认订单        │
├──────────────────────────────────────┤
│                                      │
│  📄 五年级数学单元练习卷 (20题)        │
│                                      │
│  打印份数: [  −  ]  30 份  [  +  ]   │
│                                      │
│  分档计费 (高亮当前档):               │
│  ┌────────────────────────────────┐  │
│  │ 1-10份    ¥5.00 / 份           │  │
│  │ 11-50份   ¥4.00 / 份  ◀ 当前   │  │
│  │ 51份以上  ¥3.00 / 份           │  │
│  └────────────────────────────────┘  │
│                                      │
│  收货地址:                            │
│  ┌────────────────────────────────┐  │
│  │ [默认] 张三 138****8000     >  │  │
│  │ 浙江省杭州市西湖区文三路138号    │  │
│  └────────────────────────────────┘  │
│  [+ 新增地址]                        │
│                                      │
│  费用: 30份 × ¥4.00 = ¥120.00       │
│                                      │
│  [ 确认支付  ¥120.00 ]               │
└──────────────────────────────────────┘
```

### 交互逻辑
1. 进入页面 → 加载试卷信息 + 定价配置
2. 份数 ± 按钮 → 实时重算价格 + 高亮档位
3. 点击地址区域 → 跳转地址列表选择（单选返回）
4. 点击「新增地址」→ 跳转地址编辑页
5. 点击「确认支付」→ `POST /v1/orders { type: 'print', ... }` → 唤起微信支付

### 数据流
```
onLoad:
  GET /v1/pricing/public        → 定价配置
  GET /v1/paper/:id (或从 query 带过来) → 试卷信息
  GET /v1/shipping-addresses    → 默认地址

份数变化 → PricingService 前端等效逻辑重算
  匹配档位 → 更新显示单价 + 总价

提交:
  POST /v1/orders
    { paperId, type: 'print', copies, shippingAddressId }
    → 获取 wxPayParams → wx.requestPayment → 跳转订单详情
```

### 验收
- [ ] 份数可增减，最少1份，无上限
- [ ] 档位高亮随份数变化
- [ ] 无地址时提示添加
- [ ] 默认地址自动选中
- [ ] 点击支付 → 创建订单 → 唤起微信支付
- [ ] 支付成功后跳转打印订单详情

---

## Task 2.3 — 收货地址管理

**预估**：3h  
**文件**：
- [frontend/src/pages/address/list/index.vue](frontend/src/pages/address/list/index.vue) 🆕
- [frontend/src/pages/address/edit/index.vue](frontend/src/pages/address/edit/index.vue) 🆕

### 地址列表页

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
│  [+ 新增地址]                        │
└──────────────────────────────────────┘
```

### 地址编辑页

```
┌──────────────────────────────────────┐
│  ← 返回    新增地址 / 编辑地址        │
├──────────────────────────────────────┤
│  收货人:    [____________]           │
│  手机号:    [____________]           │
│  省/市/区:  [▼] [▼] [▼]             │
│  详细地址:  [____________]           │
│  [✓] 设为默认地址                     │
│  [ 保存 ]                            │
└──────────────────────────────────────┘
```

### 交互
- 从结算页进入列表 → 单选模式，点击地址直接返回（带选中地址）
- 从个人中心进入列表 → 管理模式，可增删改
- 编辑页：新建 mode=create / 编辑 mode=edit
- 省市区用 uni-app 的 `<picker mode="region">` 组件

### 验收
- [ ] 列表正常展示，默认地址标为 [默认]
- [ ] 新增地址成功
- [ ] 编辑地址回填数据
- [ ] 删除地址二次确认
- [ ] 设为默认后列表刷新
- [ ] 从结算页选中地址返回正常

---

## Task 2.4 — 订单列表 Tab 改造

**预估**：2h  
**文件**：[frontend/src/pages/orders/index.vue](frontend/src/pages/orders/index.vue) ✏️

### 改动

```
原（无 Tab）：
  ┌─────────────────────────────────┐
  │  我的订单                        │
  │  ┌─ 订单卡片1 ──────────────────┐│
  │  └──────────────────────────────┘│
  │  ┌─ 订单卡片2 ──────────────────┐│
  │  └──────────────────────────────┘│
  └─────────────────────────────────┘

新（双 Tab）：
  ┌─────────────────────────────────┐
  │  我的订单                        │
  │  [ 下载服务 ]    [ 打印服务 ]    │
  ├─────────────────────────────────┤
  │  Tab=下载：复用现有卡片样式       │
  │  · 显示 type=download 的订单     │
  │  · 已支付显示 [下载] 按钮        │
  ├─────────────────────────────────┤
  │  Tab=打印：打印卡片样式           │
  │  · 显示 type=print 的订单        │
  │  · 摘要：份数、收货人、物流状态   │
  │  · 点击进入详情                  │
  └─────────────────────────────────┘
```

### 数据流
- Tab 切换 → `GET /v1/orders?type=download|print`
- 下拉刷新 → 重新请求当前 Tab

### 验收
- [ ] Tab 切换正常加载对应类型订单
- [ ] 下载 Tab 已支付订单显示下载按钮
- [ ] 打印 Tab 显示份数、收货人、物流状态
- [ ] 点击打印订单进入详情
- [ ] 下拉刷新正常

---

## Task 2.5 — 订单详情适配打印

**预估**：1.5h  
**文件**：[frontend/src/pages/orders/detail/index.vue](frontend/src/pages/orders/detail/index.vue) ✏️

### 改动

根据 `order.type` 切换展示：

**下载订单**：现有详情不变。

**打印订单**：
```
┌──────────────────────────────────────┐
│  ← 返回    订单详情                   │
├──────────────────────────────────────┤
│  🖨️ 打印服务                          │
│                                      │
│  订单编号: 20260608123456789012       │
│  下单时间: 2026-06-08 10:00          │
│  支付时间: 2026-06-08 10:01          │
│  订单金额: ¥120.00                   │
│                                      │
│  ── 试卷信息 ────────────────────    │
│  五年级数学单元练习卷 (20题)           │
│                                      │
│  ── 打印信息 ────────────────────    │
│  打印份数: 30份                       │
│  单价: ¥4.00 / 份 (第2档 11-50份)    │
│                                      │
│  ── 收货地址 ────────────────────    │
│  张三                               │
│  138****8000                        │
│  浙江省杭州市西湖区文三路138号        │
│                                      │
│  ── 物流状态 ────────────────────    │
│  ● 打印中     2026-06-08 11:00       │
│  ○ 已发货                           │
│  ○ 已签收                           │
└──────────────────────────────────────┘
```

### 物流时间线逻辑
- 调用 `GET /v1/orders/:id` 获取 `printStatusLog`
- 三种状态 + "待处理"未开始时
- 当前到达状态高亮 ●，未到达 ○

### 验收
- [ ] 打印订单显示完整信息
- [ ] 物流时间线正确高亮当前状态
- [ ] 下载订单不受影响

---

## Task 2.6 — API 层 + Store 扩展

**预估**：1h  
**文件**：
- [frontend/src/api/index.ts](frontend/src/api/index.ts) ✏️（增加地址/定价 API）
- [frontend/src/stores/order.ts](frontend/src/stores/order.ts) ✏️（增加 type/scope 参数）
- [frontend/src/stores/address.ts](frontend/src/stores/address.ts) 🆕（可选，地址 store）

### 新增 API 方法

```typescript
// 定价
getPublicPricing(): Promise<PricingData>

// 收货地址
getShippingAddresses(): Promise<Address[]>
createShippingAddress(data): Promise<{ id: string }>
updateShippingAddress(id, data): Promise<void>
deleteShippingAddress(id): Promise<void>

// 订单扩展
getOrders({ type, scope, page }): Promise<OrderList>
getOrderDetail(id): Promise<OrderDetail>
```

### 验收
- [ ] API 调用返回数据格式正确
- [ ] Store 状态更新正常

---

# Phase 3 — 前端管理端

> 目标：管理员可配置定价、统一管理所有订单、操作打印物流状态。

---

## Task 3.1 — 定价配置页

**预估**：2.5h  
**文件**：[frontend/src/pages/admin/pricing/index.vue](frontend/src/pages/admin/pricing/index.vue) 🆕

### 页面结构

```
┌──────────────────────────────────────────┐
│  ← 返回    定价配置                       │
├──────────────────────────────────────────┤
│                                          │
│  ── 下载服务（按题计费）────────────────  │
│                                          │
│    单题价格:  [  2.00  ]  元 / 题        │
│    示例: 20题 = ¥40.00                   │
│                                          │
│  ── 打印服务（分档计费）────────────────  │
│                                          │
│    第1档:  [ 1 ] ~ [ 10 ] 份             │
│            单价 [ 5.00 ] 元/份           │
│                                          │
│    第2档:  [ 11 ] ~ [ 50 ] 份            │
│            单价 [ 4.00 ] 元/份           │
│                                          │
│    第3档:  [ 51 ] ~ 上不封顶 份          │
│            单价 [ 3.00 ] 元/份           │
│                                          │
│  [ 保存 ]                                │
└──────────────────────────────────────────┘
```

### 交互
- `onLoad` 调用 `GET /v1/admin/pricing` 回填
- 第1档 minQuantity 固定为 1（不可编辑）
- 第3档 maxQuantity 固定为 null（显示"上不封顶"，不可编辑）
- 第1档 maxQuantity 变更 → 自动同步第2档 minQuantity = max+1
- 第2档 maxQuantity 变更 → 自动同步第3档 minQuantity = max+1
- 保存前二次确认弹窗

### 验收
- [ ] 定价数据正常回填
- [ ] 档位联动正确
- [ ] 保存二次确认
- [ ] 保存成功后更新
- [ ] 数值校验（不能为负、不能为0）

---

## Task 3.2 — 管理员订单管理页

**预估**：4h  
**文件**：[frontend/src/pages/admin/orders/index.vue](frontend/src/pages/admin/orders/index.vue) 🆕

### 页面结构

```
┌──────────────────────────────────────────────────┐
│  ← 返回    订单管理                               │
├──────────────────────────────────────────────────┤
│                                                  │
│  查看范围: [ ● 我的订单 ]  [ ○ 所有用户订单 ]      │  ← scope 切换
│                                                  │
│          [ 下载服务 ]      [ 打印服务 ]            │  ← Tab 切换
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  当前: scope=○○, Tab=打印                        │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ 🖨️ 打印 | 用户: 张老师 | 30份 | ¥120.00    │  │
│  │ 待处理 | 2026-06-08 10:00                  │  │
│  │ 收货: 张三 138****8000                  >  │  │
│  │              [ 标记打印中 ]                 │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ 🖨️ 打印 | 用户: 李老师 | 50份 | ¥200.00    │  │
│  │ 打印中 | 2026-06-07 09:00                  │  │
│  │ 收货: 李四 139****9000                  >  │  │
│  │              [ 标记已发货 ]                 │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### 交互逻辑

```
scope 切换:
  ● 我的订单 → scope=mine, 加载本人订单
  ○ 所有用户订单 → scope=others, 加载他人订单

Tab 切换:
  下载服务 → type=download
  打印服务 → type=print

接口调用:
  GET /v1/orders?scope=xxx&type=xxx&page=1

物流操作（仅 scope=others + Tab=打印）:
  print_status=null          → 显示 [ 标记打印中 ]
  print_status=printing      → 显示 [ 标记已发货 ]
  print_status=shipped       → 显示 [ 标记已签收 ]
  print_status=delivered     → 显示「已完成」，无操作按钮

操作调用:
  PUT /v1/admin/orders/:id/print-status { printStatus: 'printing' | 'shipped' | 'delivered' }
```

### 权限标识
- 范围=我的 + 下载Tab：显示下载按钮（自己的订单可下载）
- 范围=所有用户 + 下载Tab：只读列表，不显示下载按钮
- 范围=我的 + 打印Tab：显示详情入口，不显示物流操作按钮（用户只能看）
- 范围=所有用户 + 打印Tab：显示详情入口 + 物流操作按钮

### 验收
- [ ] scope 切换 + Tab 切换组合正确
- [ ] 四个象限渲染正确（我的×下载、我的×打印、所有×下载、所有×打印）
- [ ] 物流按钮随 print_status 正确切换
- [ ] 点击物流按钮 API 调用成功，列表刷新
- [ ] 自己的下载订单可下载
- [ ] 别人的下载订单无下载按钮

---

## Task 3.3 — 仪表盘 + 快捷入口更新

**预估**：1h  
**文件**：
- [frontend/src/pages/admin/dashboard/index.vue](frontend/src/pages/admin/dashboard/index.vue) ✏️
- [frontend/src/pages/index/index.vue](frontend/src/pages/index/index.vue) ✏️（或管理后台入口页）

### 改动

**仪表盘**：
- 增加「待处理打印」统计卡片：`count of print_status IS NULL AND status=paid`

**快捷入口**（管理后台首页）：
- 增加「定价配置」入口
- 现有「订单管理」入口改为指向新的 `pages/admin/orders/index`
- 删除原有独立的打印订单管理入口（已合并）

### 验收
- [ ] 待处理打印数正确显示
- [ ] 快捷入口跳转正确

---

# Phase 4 — 联调 + 回归测试

> 目标：确保新旧功能无冲突，端到端可走通。

---

## Task 4.1 — 端到端流程测试

**预估**：1.5h

### 测试路径

**路径1：下载模式（回归）**
```
微信登录 → 组卷配置 → 生成试卷 → 预览 → 点击「下载试卷」→ 支付 → 下载文件
```
- [ ] 通过 ✅

**路径2：打印模式（新）**
```
微信登录 → 组卷配置 → 生成试卷 → 预览 → 点击「打印并快递」
→ 选择份数 → 选择地址 → 支付 → 查看订单详情（物流待处理）
```
- [ ] 通过 ✅

**路径3：管理员处理打印订单**
```
管理员登录 → 订单管理 → 范围=所有用户 → Tab=打印
→ 标记打印中 → 标记已发货 → 标记已签收
```
- [ ] 通过 ✅

**路径4：用户查看打印物流**
```
用户登录 → 我的订单 → Tab=打印 → 点击订单 → 查看物流时间线
```
- [ ] 通过 ✅

### 验收
- [ ] 四条路径全部走通
- [ ] 支付金额正确
- [ ] 物流状态正确流转
- [ ] 下载功能不受影响

---

## Task 4.2 — 权限校验测试

**预估**：1h

| 测试场景 | 预期结果 |
|----------|---------|
| teacher 调用 `scope=others` | 403 |
| teacher 调用 `GET /v1/admin/pricing` | 403 |
| teacher 调用 `PUT /v1/admin/orders/:id/print-status` | 403 |
| admin 调用 `scope=others` | 200 |
| admin 调用 `GET /v1/orders?scope=others` 返回他人订单 | 不含下载链接 |
| 用户 A 修改用户 B 的地址 | 403 |
| 用户 A 删除用户 B 的地址 | 403 |

- [ ] 全部通过

---

## Task 4.3 — 定价边界测试

**预估**：1h

| 测试场景 | 预期 |
|----------|------|
| copies=1 → tier 1 | 总价 = 1 × 500 = 500 |
| copies=10 → tier 1 | 总价 = 10 × 500 = 5000 |
| copies=11 → tier 2 | 总价 = 11 × 400 = 4400 |
| copies=50 → tier 2 | 总价 = 50 × 400 = 20000 |
| copies=51 → tier 3 | 总价 = 51 × 300 = 15300 |
| copies=9999 → tier 3 | 总价 = 9999 × 300 |
| 下载 20题 × ¥2.00 | 总价 = 4000 |
| 管理员改价为 ¥3.00/题 | 新订单正确使用 ¥3.00 |

- [ ] 全部通过

---

# 文件变更总清单

## 新增文件 (backend)

```
backend/src/database/migrations/002_print_pricing.sql
backend/src/database/entities/shipping-address.entity.ts
backend/src/database/entities/pricing-config.entity.ts
backend/src/modules/print/print.module.ts
backend/src/modules/print/services/pricing.service.ts
backend/src/modules/print/services/shipping-address.service.ts
backend/src/modules/print/services/print-order.service.ts
backend/src/modules/print/dto/create-address.dto.ts
backend/src/modules/print/dto/update-address.dto.ts
backend/src/modules/print/dto/update-pricing.dto.ts
backend/src/modules/print/dto/update-print-status.dto.ts
backend/src/modules/print/services/pricing.service.spec.ts
backend/src/modules/print/services/shipping-address.service.spec.ts
```

## 修改文件 (backend)

```
backend/src/database/entities/order.entity.ts
backend/src/modules/order/order.module.ts
backend/src/modules/order/order.controller.ts
backend/src/modules/order/order.service.ts
backend/src/modules/order/order.service.spec.ts
backend/src/modules/admin/admin.module.ts
backend/src/modules/admin/admin.controller.ts
backend/src/app.module.ts
```

## 新增文件 (frontend)

```
frontend/src/pages/print/checkout/index.vue       (打印结算页)
frontend/src/pages/address/list/index.vue          (地址列表)
frontend/src/pages/address/edit/index.vue          (地址编辑)
frontend/src/pages/admin/pricing/index.vue         (定价配置)
frontend/src/pages/admin/orders/index.vue          (管理员订单管理)
frontend/src/stores/address.ts                     (地址 Store, 可选)
```

## 修改文件 (frontend)

```
frontend/src/pages/paper/preview/index.vue         (分流卡片)
frontend/src/pages/orders/index.vue                (Tab 双栏)
frontend/src/pages/orders/detail/index.vue         (打印详情+物流)
frontend/src/pages/admin/dashboard/index.vue       (统计卡片)
frontend/src/pages/index/index.vue                 (快捷入口)
frontend/src/api/index.ts                          (新增 API 方法)
frontend/src/stores/order.ts                       (扩展参数)
```

---

> **开始开发前，请确认设计文档 [Print_Module.md](../03_Design/Modules/Print_Module.md) V2.1 已审阅通过。**
