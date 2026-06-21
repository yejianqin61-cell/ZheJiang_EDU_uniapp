# Issue: Vitest 页面测试存在 Element Plus `size="large"` DOM 告警

- 日期：2026-06-21
- 模块：`frontend-web` / `src/__tests__`
- 严重级别：`P3`
- 状态：`待处理`

## 现象

执行 `cd frontend-web && npm test` 时，测试虽然全部通过，但多个页面测试会持续输出同类 Vue 告警：

1. `Failed setting prop "size" on <input>: value large is invalid.`
2. 主要出现在登录、地址编辑、练习上传、管理端练习管理、提现等页面测试中。

## 影响

- 当前不会导致断言失败，但会污染测试日志。
- 会掩盖真正需要关注的运行时告警，降低回归结果的可读性。
- 说明测试环境中的 Element Plus 组件桩与真实组件契约仍有偏差。

## 初步判断

1. 页面模板中大量使用了 Element Plus 表单组件的 `size="large"`。
2. 测试环境里部分组件被简化为原生 `<input>` 或透传属性的轻量桩。
3. `size="large"` 被直接落到原生 DOM `input.size` 属性后触发 DOMException，因此形成重复告警。

## 建议处理

1. 梳理 `frontend-web/src/__tests__/setup.ts` 与相关页面测试中的全局 stub。
2. 为 `el-input` / `el-input-number` / `el-select` 等常用表单组件提供更贴近真实契约的测试桩，避免将 `size` 等组件属性直接透传到原生节点。
3. 清理后重新执行 `frontend-web` 全量测试，确认日志恢复干净。

## 验证现状

- `cd frontend-web && npm test`：`42` files / `127` tests 全部通过，但存在重复告警输出
- `cd frontend-web && npm run build`：通过
