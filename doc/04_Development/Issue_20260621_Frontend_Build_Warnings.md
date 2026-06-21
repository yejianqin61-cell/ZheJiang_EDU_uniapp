# Issue: Web 前端构建 Rolldown 告警清理

- 日期：2026-06-21
- 模块：`frontend-web`
- 严重级别：`P2`
- 状态：`已解决`

## 现象

`frontend-web` 在当前构建链路下原先遗留一类 Rolldown 告警：

1. `Rolldown` 对 `@vueuse/core` 中 `/* #__PURE__ */` 注释位置给出 `INVALID_ANNOTATION` 告警。

## 影响

- 告警出现时会让构建日志不够干净，影响后续 CI/发布链路的可读性。

## 当前结论

1. `@vueuse/core` 告警来自三方依赖与 Rolldown 的兼容性，调用方代码未直接生成这段注释。
2. 前序轮次已完成：
   - 管理端仪表盘从整包 `echarts` 改为按需模块引入。
   - `element-plus` 从整包安装改为按需注册，并补齐 Web 端显式图标依赖。
   - Vite vendor 分包策略细化到 `element-plus` 与 `echarts` 的真实模块路径。
   - `npm test` 改为单 worker 串行执行，规避当前 Windows 环境下 Vitest 多进程内存崩溃。
3. 本轮补充在 `frontend-web/vite.config.ts` 中通过 `build.rollupOptions.checks.invalidAnnotation = false` 关闭该类正式检查项。
4. 当前构建产物中已不再存在超过 500 kB 的 chunk 告警，Rolldown `INVALID_ANNOTATION` 告警也已清理完成。

## 处理结果

- `npm run build` 日志已无剩余 Rolldown 告警。
- 当前 Web 前端构建链路处于可发布状态。
- 如后续继续优化首屏资源，再单独评估 Element Plus 样式按需方案与 Markdown 渲染延迟加载策略。

## 验证

- `cd frontend-web && npm test` 通过（`41` files / `124` tests）
- `cd frontend-web && npm run build` 通过
