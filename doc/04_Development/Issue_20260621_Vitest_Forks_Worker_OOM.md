# Issue: Web 前端全量测试在 Windows 下偶发 Vitest forks worker 崩溃

- 日期：2026-06-21
- 模块：`frontend-web`
- 严重级别：`P2`
- 状态：`待处理`

## 现象

执行 `cd frontend-web && npm test` 时，偶发出现以下非断言类失败：

1. `Error: [vitest-pool]: Worker forks emitted error`
2. `Worker exited unexpectedly`
3. `FATAL ERROR: Zone Allocation failed - process out of memory`

同一代码状态下，复跑后又可能恢复为 `43 files / 133 tests` 全量通过。

## 影响

- 会让前端回归结果变得不稳定。
- 阻碍“改完即测、测完即提交”的批次节奏。
- 容易与真实业务回归失败混淆，降低测试日志可信度。

## 当前判断

1. 该问题更像是当前 Windows 环境下 Vitest `forks` worker 池的宿主稳定性问题，而不是业务代码断言失败。
2. 目前脚本已经限制为单 worker 串行执行，但运行日志仍显示 `forks` worker 崩溃，说明仅 `--maxWorkers=1 --no-file-parallelism` 还不足以完全规避。
3. 之前尝试 `threads` 池时也出现过单文件超时，因此需要单独评估更稳定的池配置或 Vitest 配置项。

## 建议处理

1. 单独验证 `--pool=threads`、`--pool=vmThreads` 与配置文件内显式 `pool` 设置在当前仓库下的稳定性。
2. 若线程池仍不稳定，继续排查是否存在与 `jsdom`、`echarts` mock、假定时器或特定页测组合有关的 worker 启动问题。
3. 在找到稳定方案前，保留“失败后立即复跑一次”的临时操作约定，但不把它当最终解决方案。

## 复现记录

- 2026-06-21：一次全量回归出现 `41 passed / 2 worker errors`
- 2026-06-21：紧接着复跑，同一代码状态下恢复 `43 passed / 133 tests passed`

## 当前验证

- `cd frontend-web && npm test`：存在偶发 worker 崩溃，复跑可通过
- `cd frontend-web && npm run build`：通过
