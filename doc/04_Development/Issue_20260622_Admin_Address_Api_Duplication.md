# Issue: `admin` API 模块重复维护收货地址接口

日期：2026-06-22

## 现象

- 前端已经存在独立的地址 API 模块：
  - `frontend-web/src/api/modules/address.ts`
- 但 `frontend-web/src/api/modules/admin.ts` 仍重复声明：
  - `getAddresses()`
  - `createAddress()`
  - `updateAddress()`
  - `deleteAddress()`

## 风险

- 同一组 `/shipping-addresses` 接口被两个模块分别维护，类型和行为容易漂移。
- 一处修复后另一处漏改，会导致不同页面各自依赖不同契约。
- 这与前面已经完成的“页面层统一复用共享 API 模块”的方向相冲突。
- 同批排查中还发现管理端提现页原本读取 `userPhone`，而后端 `/admin/withdrawals` 实际返回 `userName`，说明 `admin` 模块中的弱类型已经开始放大页面字段漂移。

## 处理建议

1. 地址能力统一由 `address.ts` 维护
2. `admin.ts` 中移除重复地址 API，只保留真正的管理端能力
3. 相关测试改为围绕共享 `address` 模块断言
