# Issue: 余额接口契约已经扩展，前端类型与余额页展示仍停留在旧模型

日期：2026-06-22

## 现象

- 后端 `GET /users/me/balance` 实际由 `backend/src/modules/balance/services/balance.service.ts` 返回：
  - `balance`
  - `totalEarned`
  - `totalSpent`
- 前端 `frontend-web/src/api/modules/auth.ts` 中的 `BalanceSummary` 仅声明了 `balance`
- 前端余额页 `frontend-web/src/pages/profile/balance/index.vue` 也只展示账户余额，没有消费同接口已提供的累计收入/支出信息
- `getBalanceLog()` 同样缺少显式返回类型，导致余额相关链路继续保留弱类型入口

## 风险

- 余额接口契约一旦继续演进，前端类型系统无法及时暴露漂移。
- 页面已经请求到的资金统计信息没有被展示，用户可见信息不完整。
- 余额流水接口继续使用 `any`，会让后续流水页或提现页扩展再次扩散弱类型。

## 处理建议

1. 将前端 `BalanceSummary` 对齐到后端真实返回结构
2. 为 `getBalanceLog()` 补齐显式 item / pagination / response 类型
3. 在余额页展示累计收入与累计支出，并补齐对应测试断言
