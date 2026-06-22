# Issue: 管理端审核页面仍在使用弱错误类型

日期：2026-06-22

## 现象

- `frontend-web/src/pages/admin/review/index.vue` 的单条审核动作仍使用 `catch (error: any)`
- `frontend-web/src/pages/admin/review/detail/index.vue` 的通过/拒绝动作也仍直接消费 `error?.message`
- 这两页都已直接复用共享 `admin` API 模块，但页面错误分支还没有收口

## 风险

- 审核主链路中的异常对象继续绕开类型系统。
- 同一类错误消息解析逻辑在列表页和详情页重复漂移。
- 后续审核流程扩展时容易把 `any` 再扩散回管理端页面。

## 处理建议

1. 用 `unknown` 接住审核动作异常
2. 在页面内收口最小必要的错误消息提取逻辑
3. 保持审核成功/失败提示和刷新、回退行为不变
