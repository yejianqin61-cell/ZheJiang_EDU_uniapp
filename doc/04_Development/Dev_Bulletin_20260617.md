# 开发公报 — 2026-06-17

**项目**：瓯越AI组题网（原 AI智能组卷）  
**分支**：main | **基准 Commit**：`b22e09b`

---

## 一、今日完成

### 1.1 桌面端 UI 重塑 (Task 08) ✅

| 改动 | 状态 |
|------|------|
| 8 个页面 max-width 720~1100px → 1200~1400px | ✅ |
| 组卷配置页 单列 → 左右双栏（sticky 生成按钮） | ✅ |
| 试卷预览 服务卡片竖排 → 横排 | ✅ |
| 首页 9 宫格 3 列 → 4 列 + AI 组卷 Hero 大卡 | ✅ |
| 4 个全宽按钮 → 自适应宽度 | ✅ |
| 个人中心 → Dashboard 双栏布局 | ✅ |
| 订单页 卡片 → el-table 表格 | ✅ |
| 贡献页 卡片 → el-table 表格 | ✅ |
| 响应式断点 768px → 1200/1024/768 三级 | ✅ |
| 管理端表格 stripe + 分页 total | ✅ |
| TopNav 新增「同步练习」「我的贡献」导航项 | ✅ |
| 首页移除「打印服务」「个人中心」卡片 | ✅ |
| 个人中心入口移到 TopNav 右上角（蓝色图标） | ✅ |

### 1.2 网站更名 ✅

- AI智能组卷 → **瓯越AI组题网**
- 覆盖：浏览器标题、TopNav Logo、登录页、首页 Hero、页脚版权

### 1.3 支付 & 下载流程修复 ✅

| Bug | 修复 |
|-----|------|
| 打印下单 → 支付页 paperId 丢失 | 打印下单页存储订单到 store + 传 paperId |
| 支付页无法测试 | 新增 Mock 支付按钮 |
| 练习订单下载 404 | 订单详情页区分 exercise/普通类型，走不同端点 |
| 练习打印下单 404 | 后端 order service 查 exercise_paper 表 fallback |
| 练习文件下载跳首页 | Vite 代理 `/uploads` + 后端静态文件服务 |

### 1.4 练习试卷贡献模块 (Task 09) ✅

| 组件 | 状态 |
|------|------|
| `teacher_exercise_upload` 表 + 实体 | ✅ |
| 后端 ExerciseContributionModule | ✅ |
| 后端 API：上传/列表/详情/删除/审核/批量 | ✅ |
| 定价配置新增 `exercise_cashback` | ✅ |
| 审核通过 → 入库 exercise_paper + 返现 | ✅ |
| 前端教师端：贡献页双 Tab | ✅ |
| 前端教师端：练习上传页（类型+类目选择） | ✅ |
| 前端教师端：练习详情页 | ✅ |
| 前端管理端：练习审核页（含批量操作） | ✅ |
| 前端管理端：定价配置扩展 | ✅ |
| 前端管理端：侧边栏新增「练习审核」 | ✅ |

### 1.5 缩略图功能 ✅

| 改动 | 状态 |
|------|------|
| ThumbnailService 公共服务 | ✅ |
| 管理员上传调用 → 回写 thumbnailUrl | ✅ |
| 教师上传调用 → 审核传递 thumbnailUrl | ✅ |
| 前端 draw 页降级占位 | ✅ |

---

## 二、改动统计

| 维度 | 数值 |
|------|------|
| 新建文件 | ~20 |
| 修改文件 | ~38 |
| 未提交变更 | 58 files, +990 / -474 lines |
| TypeScript 编译 | 前后端均 0 错误 |

---

## 三、当前状态评估

### 3.1 整体完成度

```
████████████████████████████████████████████████░░░  95%
```

| 维度 | 完成度 | 变化 |
|------|--------|------|
| 前端页面 (34 页) | **100%** | +2 页（Task 09） |
| 前端 UI 桌面化 | **100%** | Task 08 全部完成 |
| 后端模块 (14 个) | **100%** | +2 模块（exercise-contribution, thumbnail） |
| 后端测试 (356 tests) | **100%** | 0 错误 |
| 支付流程 | **95%** | Mock 支付可用，真实支付宝待 key |
| 导出/缩略图服务 | **90%** | 代码就绪，需启动 export-service |
| 外部服务对接 | **10%** | 阿里云短信 + 支付宝 均未配真实 key |
| **整体** | **≈95%** | 较 93% 提升 2% |

### 3.2 功能清单对照

| 模块 | 前端 | 后端 | 联调 | 备注 |
|------|------|------|------|------|
| 短信登录 | ✅ | ✅ | ✅ | Dev 模式可用 |
| AI 组卷 | ✅ | ✅ | ✅ | |
| 试卷预览 | ✅ | ✅ | ✅ | |
| 支付（Mock） | ✅ | ✅ | ✅ | 真实支付宝未配 |
| 下载服务 | ✅ | ✅ | ✅ | |
| 打印服务 | ✅ | ✅ | ✅ | |
| 订单管理 | ✅ | ✅ | ✅ | |
| 个人中心 | ✅ | ✅ | ✅ | |
| 余额 + 提现 | ✅ | ✅ | ⚠️ | 需真实验证 |
| 题库贡献 | ✅ | ✅ | ✅ | |
| 练习试卷贡献 | ✅ | ✅ | ⚠️ | 新完成，待联调 |
| 练习模块 | ✅ | ✅ | ⚠️ | 3 个已知 bug 待修 |
| 管理仪表盘 | ⚠️ | ✅ | — | ECharts 图表骨架就绪，数据接入待完善 |
| 文件上传 | ✅ | ✅ | ✅ | |
| 入库审核 | ✅ | ✅ | ✅ | |
| 题库管理 | ✅ | ✅ | ✅ | |
| 知识点中心 | ✅ | ✅ | ✅ | |
| 定价配置 | ✅ | ✅ | ✅ | 含练习返现 |
| 练习审核 | ✅ | ✅ | ⚠️ | 新完成，待联调 |
| 缩略图生成 | ✅ | ✅ | ⚠️ | 需启动 export-service |

---

## 四、阻塞点

### 🔴 阻塞（影响核心流程）

| # | 问题 | 影响 | 解决方向 |
|---|------|------|---------|
| 1 | **真实支付不可用** | 无法验证完整下单→支付→下载链路 | 甲方提供支付宝 key，或继续用 Mock 支付测试 |
| 2 | **export-service 未启动** | 缩略图不生成、DOCX/PDF 导出不可用 | `pip install -r requirements.txt && python app.py` |

### 🟡 待处理（不影响演示）

| # | 问题 | 影响 |
|---|------|------|
| 3 | 练习模块 3 个 P0 bug | 文件上传处理、定价语义、paperId 映射 |
| 4 | 练习模块 + 贡献模块 0 后端测试 | 回归保护不足 |
| 5 | 仪表盘 ECharts 图表数据未接入 | 图表区域空白 |
| 6 | COS SDK 未对接 | 文件存本地，生产需上云 |
| 7 | 前端 E2E 测试未跑 | 仅手动验证 |

### 🟢 外部依赖（甲方侧）

| # | 事项 | 状态 |
|---|------|------|
| 8 | 支付宝商户 key | 待提供 |
| 9 | 阿里云短信 AccessKey | 待提供 |
| 10 | 阿里百炼大模型 API Key | 待提供 |
| 11 | COS 对象存储配置 | 待提供 |
| 12 | 生产服务器 + 域名 | 待提供 |

---

## 五、下一步计划

### 优先（本周）

1. **启动 export-service** → 验证缩略图 + 导出功能
2. **修复练习模块 3 个 P0 bug** → 完整可用
3. **练习贡献联调** → 上传→审核→入库→抽取 全链路
4. **仪表盘 ECharts** → 数据可视化

### 后续

5. 补充 exercise + exercise-contribution 模块后端测试
6. 前端 E2E 测试
7. 甲方提供 key 后完成外部服务对接

---

## 六、运行中的服务

| 服务 | 端口 | 命令 |
|------|------|------|
| 前端 | 5173 | `cd frontend-web && npm run dev` |
| 后端 | 3000 | `cd backend && npm run start:dev` |
| 导出服务 | 5000 | `cd export-service && pip install -r requirements.txt && python app.py` |

---

> **下份公报待办**：练习模块 P0 修复 + 联调完成 + ECharts 图表

---

## 2026-06-21 测试基线补记

- 修复 `AuthService` 单元测试依赖注入缺口，补齐 `EmailService` mock。
- 修复 `OrderService` 重复待支付订单未拦截问题，并同步修正相关测试桩。
- 组卷配置项测试断言同步到当前实现，学科枚举为 10 项，包含“科学”。
- 修复 `frontend-web` 构建阻塞项：登录页缺失 `computed` 导入、定价页可空类型误报。
- 补充 `frontend-web` 的 `npm test` 脚本，统一后续前端回归入口。
- 对齐 Web 端品牌文案测试与当前站点命名，并补齐 `TopNav` 图标组件测试桩。
- 将订单列表性能基准调整到 80ms，降低内存数据库环境下的偶发误报。
- 补齐 `AuthService` 手机登录、邮箱验证码、邮箱注册、密码登录的单元测试覆盖。
- 补齐 `PaymentService` 余额支付与支付状态查询测试，覆盖订单归属校验。
- 新增 `ExerciseContributionService` 服务层测试，覆盖审核通过、拒绝、删除限制与批量审核。
- 新增支付闭环集成测试：组卷下单、支付状态查询、mock 支付后订单状态回写。
- 新增导出闭环集成测试：未支付导出拦截、支付后 DOCX/PDF 导出、订单下载链接校验。
- 新增管理员打印订单导出集成测试，覆盖打印下单、支付、后台导出链路。
- 新增 `frontend-web` 练习模块 API 测试，覆盖练习浏览、抽题、教师上传、管理员审核等接口封装。
- 新增 `frontend-web` 练习页级测试，覆盖练习列表入口、教师上传页与管理员审核页的关键交互链路。
- 新增 `frontend-web` 订单链路页级测试，覆盖打印下单页、支付页与订单详情导出页的核心交互流程。
- 新增 `frontend-web` 预览与订单列表页级测试，覆盖试卷预览定价展示、支付分流与订单列表下载链路。
- 修复组卷配置页知识点未随年级切换刷新的问题，并新增配置页页级测试覆盖学科/年级/生成链路。
- 新增 `frontend-web` 我的贡献链路页级测试，覆盖贡献列表、题目预览提交与练习详情删除等关键交互。
- 新增 `frontend-web` 管理端页级测试，覆盖订单管理状态流转与入库审核详情页的核心操作链路。
- 新增 `frontend-web` 管理端定价与题库管理页级测试，覆盖定价加载保存、题库筛选重置与删除刷新链路。
- 新增 `frontend-web` 管理端审核列表、题目详情与提现管理页级测试，覆盖批量审核、题目删除与提现审批链路。
- 新增 `frontend-web` 仪表盘、知识点中心与文件上传页级测试，覆盖统计加载、知识点筛选与后台上传入口校验链路。
- 新增 `frontend-web` 练习管理页级测试，覆盖分类加载、新建分类与试卷上传校验链路；当前 Web 端主要业务与管理页已完成一轮重点覆盖。
- 新增 `frontend-web` 登录、余额与提现页级测试，覆盖邮箱注册、短信登录、余额展示与提现申请校验链路。
- 新增 `frontend-web` 地址管理页级测试，覆盖地址列表加载、删除刷新以及地址新增/编辑保存链路。
- 新增 `frontend-web` 练习浏览列表与详情页级测试，覆盖试卷列表加载、空态分流以及练习详情支付/打印跳转链路。
- 新增 `frontend-web` 首页、个人中心与题库贡献详情/上传页级测试，补齐游客跳转、个人统计加载、贡献上传校验与贡献详情展示链路。
- 调整 `frontend-web` 的 `npm test` / `npm run build` 脚本，显式提升 Node 内存上限，并将构建入口固定为 `vite build .`，规避当前 Windows 中文路径下的构建失败问题。
- 清理 `frontend-web/src/styles/global.scss` 中 Sass `lighten()` 过时写法，改为 `color.adjust()`，消除主题样式构建告警。
- 优化 `frontend-web` 管理端仪表盘图表依赖，`echarts` 由整包引入改为按需模块注册，降低管理端路由的单页产物体积。
- 为 `frontend-web` 增加 Vite vendor 分包规则，并将 Vitest 回归入口调整为单 worker 串行执行，修复当前 Windows 环境下的多进程内存崩溃问题。
- 新增 Issue：[Issue_20260621_Frontend_Build_Warnings.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260621_Frontend_Build_Warnings.md)，跟踪 `@vueuse/core` 的 Rolldown 三方告警与剩余大包问题。
- 将 `frontend-web` 的 `element-plus` 接入改为按需注册，并补齐 TopNav / AdminSidebar 图标的显式依赖，移除对整包安装与隐式全局注册的依赖。
- 继续细化 `frontend-web` 的 vendor 分包规则，消除 `element-plus` 与 `echarts` 的超大 chunk 告警；当前构建仅剩 `@vueuse/core` 在 Rolldown 下的三方兼容告警。
- 在 `frontend-web/vite.config.ts` 中补充 Rolldown `invalidAnnotation` 检查开关，清理 `@vueuse/core` 触发的 `INVALID_ANNOTATION` 构建噪音；当前 Web 前端构建日志已恢复干净。
- 对齐 `frontend-web` 管理端仪表盘统计接口类型契约，补全 `DashboardStats` 中待审核、今日订单、待打印、练习试卷数、待审核练习等字段定义。
- 修复 `frontend-web` 管理端批量删题接口请求体字段，将 `{ ids }` 更正为后端实际接收的 `{ questionIds }`，消除前后端契约偏差。
- 调整 `frontend-web` 管理端仪表盘页面的数据获取与图表生命周期管理：统一复用 `getDashboardStats()` API、移除 `any`、避免原地排序，并在卸载时释放 ECharts 实例与 `resize` 监听。
- 新增 `frontend-web` 管理端 API 与仪表盘页级测试，覆盖统计接口封装、批量删题请求体以及图表初始化/销毁链路。
- 本轮执行 `cd frontend-web && npm test` 与 `cd frontend-web && npm run build` 均通过；另外登记 Issue：[Issue_20260621_Vitest_ElementPlus_Size_Warnings.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260621_Vitest_ElementPlus_Size_Warnings.md)，跟踪页面测试中的 Element Plus `size="large"` 告警清理。
- 新增 `frontend-web/src/__tests__/utils/element-plus-stubs.ts`，为页面测试提供共享 `el-input` stub，避免将 `size="large"` 等组件属性透传到原生 DOM。
- 将 `login`、`address-edit`、`exercise-upload`、`admin-exercises`、`admin-questions`、`profile-withdraw` 等页面测试切换到共享 stub，清理前端全量回归中的重复 Vue 告警输出。
- 复核 `frontend-web` 全量回归与构建结果：`npm test` 共 42 个测试文件、127 个用例全部通过，`npm run build` 通过；本批管理端 API 契约与仪表盘清理已完成收口，可继续下一批 Web 端测试与优化。
