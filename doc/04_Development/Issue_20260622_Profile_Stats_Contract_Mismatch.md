# Issue: 个人中心统计口径与 `/users/me/stats` 契约不一致

日期：2026-06-22

## 现象

- 前端 `frontend-web/src/api/modules/auth.ts` 将 `getUserStats()` 定义为返回：
  - `orderCount`
  - `contributionCount`
  - `balance`
- 前端 `frontend-web/src/pages/profile/index.vue` 按上述字段展示：
  - 历史订单
  - 贡献题目
  - 账户余额

## 实际契约

- 后端 `backend/src/modules/user/user.service.ts` 的 `/users/me/stats` 实际返回：
  - `totalPapers`
  - `totalPaid`
- 设计文档也明确使用同一口径：
  - `doc/03_Design/API_Specification.md`
  - `doc/03_Design/Modules/User_Module.md`

## 风险

- 个人中心统计展示与真实接口含义不一致，页面可能长期显示错误字段。
- 现有前端测试基于错误 mock 契约，无法发现该链路已发生语义漂移。
- 后续若继续围绕 `orderCount / contributionCount` 扩展，会放大前后端认知分叉。

## 处理建议

1. 前端 `UserStats` 类型回归为后端真实契约：`totalPapers / totalPaid / todayRegenerates?`
2. 个人中心 UI 文案回归为“已生成试卷 / 已支付订单”等实际可证明指标
3. 页面测试与 API 测试改为按真实契约断言
4. 若未来确实需要“贡献题目数”，应新增独立后端统计字段，而不是复用 `/users/me/stats`
