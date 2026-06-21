# Issue: Web 前端构建遗留 Rolldown 三方告警

- 日期：2026-06-21
- 模块：`frontend-web`
- 严重级别：`P2`
- 状态：`部分已解决`

## 现象

`frontend-web` 在当前构建链路下已经可以成功执行 `npm run build`，当前遗留问题收敛为一类告警：

1. `Rolldown` 对 `@vueuse/core` 中 `/* #__PURE__ */` 注释位置给出 `INVALID_ANNOTATION` 告警。

## 影响

- 构建日志仍不够干净，影响后续 CI/发布链路的可读性。
- 该问题当前不阻塞功能上线，但会持续影响 Web 端构建质量与工具链信心。

## 当前结论

1. `@vueuse/core` 告警来自三方依赖与 Rolldown 的兼容性，调用方代码未直接生成这段注释。
2. 本轮已完成：
   - 管理端仪表盘从整包 `echarts` 改为按需模块引入。
   - `element-plus` 从整包安装改为按需注册，并补齐 Web 端显式图标依赖。
   - Vite vendor 分包策略细化到 `element-plus` 与 `echarts` 的真实模块路径。
   - `npm test` 改为单 worker 串行执行，规避当前 Windows 环境下 Vitest 多进程内存崩溃。
3. 构建产物中已不再存在超过 500 kB 的 chunk 告警，当前仅剩 `@vueuse/core` 的 Rolldown 三方兼容告警。

## 后续处理方向

1. 关注 Vite / Rolldown / `@vueuse/core` 版本兼容情况，择机升级或切回更稳定的构建组合。
2. 如后续继续优化首屏资源，再单独评估 Element Plus 样式按需方案与 Markdown 渲染延迟加载策略。

## 验证

- `cd frontend-web && npm test` 通过（`41` files / `124` tests）
- `cd frontend-web && npm run build` 通过
