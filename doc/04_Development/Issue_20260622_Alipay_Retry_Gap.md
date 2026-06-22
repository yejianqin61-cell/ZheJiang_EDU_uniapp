# Issue: 支付页未打通支付宝重试链路

日期：2026-06-22

## 现象

- 后端 `OrderController.create()` 在创建订单后会尝试预创建支付宝支付单。
- 若 `createAlipayPayment()` 失败，后端仍返回成功订单，并显式允许用户后续重试：
  - `backend/src/modules/order/order.controller.ts`
- 前端支付页 `frontend-web/src/pages/payment/index.vue` 在 `currentOrder.payment?.payForm` 为空时，仅提示“支付宝未配置”，不会调用现成的 `POST /orders/:id/alipay` 重试接口。

## 风险

- 订单创建成功但首轮拉起支付宝失败时，用户无法在支付页重新发起支付宝支付。
- 页面提示会把“临时创建失败”误判成“未配置”，掩盖真实故障场景。
- 该链路缺少前端测试覆盖，后续支付改动容易再次回退。

## 处理建议

1. 支付页点击“支付宝支付”时，若本地没有 `payForm`，应调用 `payAlipay(orderId)` 补拉支付表单
2. 为 `payment` API 模块补齐显式返回类型，去掉 `Promise<any>`
3. 为支付页补充“本地无 payForm 时调用重试接口”的页面回归测试
