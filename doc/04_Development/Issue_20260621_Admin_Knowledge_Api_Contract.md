# Issue: 管理端知识点中心页仍直连底层 API，缺少共享契约与列表类型约束

- 日期：2026-06-21
- 模块：`frontend-web` / `admin/knowledge`
- 严重级别：`P2`
- 状态：`已解决`

## 现象

管理端知识点中心页原先直接调用 `api.get('/admin/knowledge-points')`，页面内使用 `any[]` 和动态参数对象拼装请求。

## 影响

- 页面层和共享 `admin` API 模块各自维护知识点中心契约，后续筛选参数或返回结构一旦调整，容易出现漂移。
- 列表项与分页结构没有类型约束，页测只能断言底层 URL，无法稳定覆盖参数构造与分页回填逻辑。
- 和前面已经收口的订单、审核、题库、定价页模式不一致，后续维护成本更高。

## 处理结果

1. 管理端知识点中心页改为复用 `getKnowledgePoints()` API 封装。
2. 为 `admin` API 模块补充知识点列表参数与返回类型定义。
3. 页面侧补齐 `KnowledgePoint` / `Pagination` / `KnowledgeFilters` 类型，去掉 `any`。
4. 更新页测与 API 测试，覆盖初始加载与筛选参数构造链路。

## 验证结果

- 定向测试：
  - `src/__tests__/api/admin.spec.ts`
  - `src/__tests__/pages/admin-knowledge.spec.ts`
- `cd frontend-web && npm test`：43 个测试文件、141 个用例通过
- `cd frontend-web && npm run build`：通过
