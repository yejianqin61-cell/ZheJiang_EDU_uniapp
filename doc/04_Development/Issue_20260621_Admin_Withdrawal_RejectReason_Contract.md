# Issue: 管理端提现拒绝接口请求体字段与后端契约不一致

- 日期：2026-06-21
- 模块：`frontend-web` / `admin/withdrawals`
- 严重级别：`P2`
- 状态：`已解决`

## 现象

管理端提现审核页在执行“拒绝”操作时，页面请求体发送的是：

```json
{
  "action": "reject",
  "rejectReason": "..."
}
```

但共享 API 封装 `frontend-web/src/api/modules/admin.ts` 原先发送的是：

```json
{
  "action": "reject",
  "reason": "..."
}
```

页面和 API 模块各自维护了不同字段，存在明显契约漂移风险。

## 影响

- 后续如果页面复用 API 模块，拒绝提现会因字段名错误而失效。
- 页面绕过 API 模块直接请求，导致契约修复无法集中治理。
- 同类问题容易在其他管理端页面重复出现。

## 处理结果

1. 将 `rejectWithdrawal()` 统一修正为后端实际需要的 `{ action: 'reject', rejectReason }`。
2. 管理端提现页改为复用 `getWithdrawals()`、`approveWithdrawal()`、`rejectWithdrawal()`，不再直连底层 `api`。
3. 补充 API 层和页面层回归测试，覆盖拒绝提现请求体字段与页面刷新链路。
4. 在本轮构建校验中一并补齐 `ExercisePaper` 类型定义，修复 `draw.vue` / `paper-detail.vue` 的相关类型问题，恢复前端构建通过。

## 验证结果

- 定向测试：
  - `src/__tests__/api/admin.spec.ts`
  - `src/__tests__/pages/admin-withdrawals.spec.ts`
  - `src/__tests__/pages/exercise-paper-detail.spec.ts`
  - `src/__tests__/pages/exercise-draw.spec.ts`
- `cd frontend-web && npm test`：43 个测试文件、133 个用例通过
- `cd frontend-web && npm run build`：通过
