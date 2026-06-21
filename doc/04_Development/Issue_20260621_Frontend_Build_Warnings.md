# Issue: Web 前端构建仍存在大包与 Rolldown 三方告警

- 日期：2026-06-21
- 模块：`frontend-web`
- 严重级别：`P2`
- 状态：`待处理`

## 现象

`frontend-web` 在当前构建链路下已经可以成功执行 `npm run build`，但仍保留两类告警：

1. `Rolldown` 对 `@vueuse/core` 中 `/* #__PURE__ */` 注释位置给出 `INVALID_ANNOTATION` 告警。
2. 产物中仍有超出 500 kB 的 vendor chunk：
   - `vendor-element-plus-*.js` 约 `966 kB`
   - `vendor-echarts-*.js` 约 `525 kB`

## 影响

- 构建日志仍不够干净，影响后续 CI/发布链路的可读性。
- 首次加载和管理端图表资源的缓存粒度仍有继续优化空间。
- 该问题当前不阻塞功能上线，但会持续影响 Web 端构建质量。

## 当前结论

1. `@vueuse/core` 告警来自三方依赖与 Rolldown 的兼容性，调用方代码未直接生成这段注释。
2. 本轮已完成：
   - 管理端仪表盘从整包 `echarts` 改为按需模块引入。
   - Vite 增加 vendor 分包策略。
   - `npm test` 改为单 worker 串行执行，规避当前 Windows 环境下 Vitest 多进程内存崩溃。
3. 告警虽已收敛，但 `element-plus` 与 `echarts` 仍是 Web 构建中的主要大包来源。

## 后续处理方向

1. 评估 `element-plus` 的按需注册或更细粒度 chunk 拆分。
2. 继续压缩管理端图表依赖，必要时将图表能力延迟到管理页内再加载。
3. 关注 Vite / Rolldown / `@vueuse/core` 版本兼容情况，择机升级或切回更稳定的构建组合。

## 验证

- `cd frontend-web && npm test` 通过（`41` files / `124` tests）
- `cd frontend-web && npm run build` 通过
