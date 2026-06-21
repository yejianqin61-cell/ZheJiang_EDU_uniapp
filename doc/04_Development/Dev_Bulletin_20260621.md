# 开发公报 — 2026-06-21

## 本轮收口

### 1. 页面测试桩治理

- 新增 `frontend-web/src/__tests__/utils/element-plus-stubs.ts`
- 将多个页测中的裸 `<input />` stub 统一替换为共享 `el-input` stub
- 清理 Element Plus `size="large"` 透传到原生 DOM 引发的测试告警
- 对应 Issue：
  - [Issue_20260621_Vitest_ElementPlus_Size_Warnings.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260621_Vitest_ElementPlus_Size_Warnings.md)

### 2. 管理端提现契约修复

- 修正 `rejectWithdrawal()` 请求体字段，统一使用后端实际接收的 `rejectReason`
- 管理端提现页改为复用 `getWithdrawals()`、`approveWithdrawal()`、`rejectWithdrawal()` API 封装
- 为 API 层和页面层补充提现拒绝链路回归测试
- 对应 Issue：
  - [Issue_20260621_Admin_Withdrawal_RejectReason_Contract.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260621_Admin_Withdrawal_RejectReason_Contract.md)

### 3. 练习试卷类型与抽题页稳定性

- 补齐 `ExercisePaper` 类型定义
- 将练习试卷详情、抽题相关 API 返回值改为强类型
- 新增 `exercise-draw` 页测，覆盖分类抽题、课时抽题、空参数和异常分支
- 修复 `exercise-draw.spec.ts` fake timers 未恢复导致的测试进程稳定性问题

## 验证结果

- 定向测试：4 个测试文件、14 个用例通过
- `cd frontend-web && npm test`：43 个测试文件、133 个用例通过
- `cd frontend-web && npm run build`：通过

## 对应提交

- `62606b8` `test: share element plus input stubs`
- 当前这批待提交：管理端提现契约与练习试卷类型收口
