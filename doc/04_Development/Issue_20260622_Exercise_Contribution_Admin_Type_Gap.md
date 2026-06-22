# Issue: 练习审核 admin 链路缺少共享类型，页面被迫扩散弱类型

日期：2026-06-22

## 现象

- 前端 `frontend-web/src/api/modules/exercise.ts` 中：
  - `adminListExerciseUploads()`
  - `adminApproveExerciseUpload()`
  - `adminRejectExerciseUpload()`
  - `adminBatchExerciseUploads()`
  长期没有显式返回类型
- `frontend-web/src/pages/admin/exercise-contributions/index.vue` 因此继续使用：
  - `const p: any`
  - `await ... as any`
  - `map((i: any) => i.id)`
  - `ElMessageBox.prompt(...) as any`

## 风险

- 审核列表分页、筛选和批量审核 payload 没有共享契约，页面和 API 模块容易继续漂移。
- 一旦后端字段变更，页面只能在运行时暴露问题。
- 同一条审核链路在管理端和教师端难以复用稳定类型。

## 处理建议

1. 为练习审核列表、批量操作、审核结果补齐共享类型
2. 页面直接消费共享类型，移除局部 `any`
3. 用页面测试和 API 测试覆盖筛选、单条审核、批量审核关键链路
