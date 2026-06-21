# Issue: Vitest 页面测试存在 Element Plus `size="large"` DOM 告警

- 日期：2026-06-21
- 模块：`frontend-web` / `src/__tests__`
- 严重级别：`P3`
- 状态：`已解决`

## 现象

执行 `cd frontend-web && npm test` 时，测试虽然可以通过，但多个页面测试会持续输出同类 Vue 告警：

1. `Failed setting prop "size" on <input>: value large is invalid.`
2. 主要出现在登录、地址编辑、练习上传、管理端练习管理、提现等页面测试中。

## 影响

- 不会直接导致断言失败，但会污染测试日志。
- 会掩盖真正需要关注的运行时告警，降低回归结果可读性。
- 说明测试环境中的 Element Plus 表单组件 stub 与真实组件契约存在偏差。

## 原因分析

1. 页面模板中大量使用了 Element Plus 表单组件的 `size="large"`。
2. 部分页测将 `el-input` 简化成了裸 `<input />` stub。
3. 组件属性被直接透传到原生 DOM 后，`size="large"` 落到 `HTMLInputElement.size`，触发 DOM 告警。

## 处理结果

1. 新增 `frontend-web/src/__tests__/utils/element-plus-stubs.ts`，提供 `inheritAttrs: false` 的 `el-input` 测试 stub。
2. 该 stub 显式接管 `modelValue`、`type`、`placeholder`、`maxlength` 和 `keyup.enter`，避免将 `size` 等组件属性透传到原生 `input`。
3. 将 `login`、`address-edit`、`exercise-upload`、`admin-exercises`、`admin-questions`、`profile-withdraw` 等页面测试中的裸 `<input />` stub 统一替换为共享 helper。

## 验证结果

- 相关页测：通过
- `cd frontend-web && npm test`：通过
- `cd frontend-web && npm run build`：通过

## 备注

当前这批已完成 `el-input` 相关告警清理。后续如出现其他 Element Plus 组件在测试环境中的属性透传问题，继续复用同一类共享 stub 策略处理。
