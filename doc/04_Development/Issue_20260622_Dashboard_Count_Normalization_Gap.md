# Issue: Dashboard 统计接口的分布计数缺少数值归一化

日期：2026-06-22

## 现象

- 后端 `backend/src/modules/admin/services/dashboard.service.ts` 中：
  - `bySubject`
  - `byGrade`
  都直接返回 `QueryBuilder#getRawMany()` 的原始结果
- 这些统计项中的 `COUNT(*)` 在数据库驱动下常以字符串形式返回
- 前端 `DashboardStats` 却将 `count` 明确定义为 `number`，管理端 dashboard 页面也按数值参与排序和图表渲染

## 风险

- 前后端契约漂移会被 TypeScript 掩盖，运行时才暴露。
- 年级排序与图表库输入会混入字符串计数，增加隐式类型转换风险。
- 后续 dashboard 统计复用时容易继续扩散“接口写 number、实际传 string”的问题。

## 处理建议

1. 后端 dashboard 服务在返回前统一将分布计数归一化为 `number`
2. 补充服务测试，显式断言 `bySubject` / `byGrade` 的计数字段为数值
3. 前端页面直接消费共享 `DashboardStats` 类型，移除局部 `any`
