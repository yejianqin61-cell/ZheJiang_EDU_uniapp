# Issue: 管理端审核详情页知识点字段与后端契约不一致

- 日期：2026-06-21
- 模块：`frontend-web` / `admin/review/detail`
- 严重级别：`P2`
- 状态：`已解决`

## 现象

管理端入库审核详情页原先按 `item.knowledgePoint?.name` 渲染知识点，但后端 `GET /admin/reviews/:id` 实际返回的是 `knowledgePoints: string[]`。

## 影响

- 审核详情页会丢失知识点展示，管理员无法直接核对题目标签结果。
- 页面测试使用了错误的单对象 mock，掩盖了真实契约问题。
- 列表页和详情页仍直连底层 `api`，增加了后续契约漂移风险。

## 处理结果

1. 为 `frontend-web/src/api/modules/admin.ts` 补充 `getReviewList()` / `getReviewDetail()` 的强类型封装。
2. 管理端审核列表页与详情页统一复用 `admin` API 模块，不再直连 `api/index`。
3. 在 `frontend-web/src/types/index.ts` 中新增 `ReviewListItem`、`ReviewDetail`、`ReviewSource` 类型。
4. 审核详情页改为消费 `knowledgePoints` 数组，并使用 `' / '` 拼接展示。
5. 更新 API 层与页测，覆盖审核列表加载、详情加载、批量审核请求体以及知识点数组渲染。

## 验证结果

- 定向测试：
  - `src/__tests__/api/admin.spec.ts`
  - `src/__tests__/pages/admin-review.spec.ts`
  - `src/__tests__/pages/admin-review-detail.spec.ts`
- `cd frontend-web && npm test`：43 个测试文件、139 个用例通过
- `cd frontend-web && npm run build`：通过
