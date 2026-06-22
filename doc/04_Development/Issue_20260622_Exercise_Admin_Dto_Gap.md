# Issue: 练习管理后台接口缺少显式 DTO，前端长期被迫吞 `any`

日期：2026-06-22

## 现象

- 后端 `backend/src/modules/exercise/exercise.controller.ts` 中以下管理端接口仍直接使用 `@Body() dto: any`
  - `POST /admin/exercise/categories`
  - `PUT /admin/exercise/categories/:id`
  - `POST /admin/exercise/lessons`
  - `PUT /admin/exercise/lessons/:id`
- 前端 `frontend-web/src/api/modules/exercise.ts` 和 `frontend-web/src/pages/admin/exercises/index.vue` 也因此长期使用 `any`

## 已知真实形状

从 `backend/src/modules/exercise/exercise.service.ts` 可以确认：

- `createCategory(dto)` 需要：
  - `type`
  - `grade`
  - `subject`
  - `name`
  - 可选 `term` / `examType`
- `updateCategory(dto)` 允许：
  - `name`
  - `term`
  - `examType`
  - `sortOrder`
- `createLesson(dto)` 需要：
  - `unitId`
  - `name`
- `updateLesson(dto)` 允许：
  - `name`
  - `sortOrder`

## 风险

- 前后端没有共享或显式契约时，练习管理页很容易继续扩散弱类型。
- 接口参数一旦变动，前端页面只能在运行时报错，测试也难以有效兜底。
- 管理端录入类接口缺少校验 DTO，会削弱 Nest 层的输入约束。

## 处理建议

1. 后端为练习管理的分类/课时 CRUD 增加显式 DTO
2. 前端 API 模块与页面统一复用这些已知字段形状
3. 页面测试补齐“创建分类 / 创建课时 / 上传试卷”关键链路断言
