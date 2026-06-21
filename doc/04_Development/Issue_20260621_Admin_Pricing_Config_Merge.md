# Issue: 管理端定价配置页未统一复用 API 封装，且部分配置返回时缺少稳态合并

- 日期：2026-06-21
- 模块：`frontend-web` / `admin/pricing`
- 严重级别：`P2`
- 状态：`已解决`

## 现象

管理端定价配置页原先直接调用底层 `api/index`，并使用宽泛断言把 `/admin/pricing` 返回值当作完整 `PricingConfig` 消费。

当后端只返回部分配置字段时，页面只能依赖浅层对象合并，无法保证嵌套配置项完整存在。

## 影响

- 一旦后端返回缺少 `exercise`、`exerciseCashback` 或某个嵌套字段，页面可能出现默认值丢失或配置编辑不完整。
- 定价页绕过共享 `admin` API 封装，会继续扩大页面层和契约层的分叉。
- API 封装缺少定价读写的类型约束，后续回归更容易被 `any` 掩盖。

## 处理结果

1. 管理端定价页改为复用 `getPricing()` / `updatePricing()` API 封装。
2. 为 `admin` API 模块补齐 `PricingConfig` 泛型返回与入参类型。
3. 新增 `mergePricingConfig()`，对下载、打印、返现、练习等嵌套配置做稳定默认值回填。
4. 更新页测与 API 测试，覆盖部分配置回填与保存链路。

## 验证结果

- 定向测试：
  - `src/__tests__/api/admin.spec.ts`
  - `src/__tests__/pages/admin-pricing.spec.ts`
- `cd frontend-web && npm test`：43 个测试文件、141 个用例通过
- `cd frontend-web && npm run build`：通过
