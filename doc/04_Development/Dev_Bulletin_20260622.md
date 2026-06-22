# 开发公报 - 2026-06-22

## 本轮收口

### 1. 管理端提现页错误处理回归补齐

- 对应 Issue：
  - [Issue_20260622_Admin_Withdrawals_Error_Handling_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Withdrawals_Error_Handling_Gap.md)
- `frontend-web/src/pages/admin/withdrawals/index.vue`
  - 列表加载失败时不再静默吞错，改为清空当前列表并提示明确错误信息
  - 审核通过、审核拒绝统一复用带兜底文案的错误消息提取逻辑
- `frontend-web/src/__tests__/pages/admin-withdrawals.spec.ts`
  - 移除拒绝弹窗结果和页面方法调用中的 `as any`
  - 补充“提现列表首次加载失败会提示错误”的回归用例

## 验证结果

- `cd frontend-web && npm.cmd test -- src/__tests__/pages/admin-withdrawals.spec.ts`：1 个测试文件、5 个用例通过

