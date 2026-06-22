# Issue: 教师练习上传链路仍缺少共享类型，页面被迫吞 `as any`

日期：2026-06-22

## 现象

- `frontend-web/src/api/modules/exercise.ts` 中教师练习上传相关接口长期未显式声明：
  - `uploadExercisePaper()`
  - `getUploadCategories()`
  - `getUploadLessons()`
- `frontend-web/src/pages/contribute/exercise-upload/index.vue` 因此继续使用：
  - `categories = ref<any[]>([])`
  - `lessons = ref<any[]>([])`
  - `await ... as any[]`
- `frontend-web/src/pages/contribute/exercise-detail/index.vue` 也继续对详情结果使用 `as any`

## 风险

- 教师练习上传页和详情页都绕开了共享契约，字段一旦变化只能在运行时报错。
- 分类、课时、上传结果这些已知结构无法被测试和类型系统稳定约束。

## 处理建议

1. 为教师练习上传相关接口补齐显式返回类型
2. 页面直接消费共享 `ExerciseCategory`、`ExerciseLesson`、`ExerciseUploadItem`
3. 移除页面内的 `any` / `as any` 断言，保持现有上传与详情行为不变
