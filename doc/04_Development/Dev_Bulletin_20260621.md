# 开发公报 - 2026-06-21

## 本轮收口

### 1. 页面测试桩治理

- 新增 `frontend-web/src/__tests__/utils/element-plus-stubs.ts`
- 将多个页测中的裸 `<input />` stub 统一替换为共享 `el-input` stub
- 清理 Element Plus `size="large"` 透传到原生 DOM 引发的测试告警
- 对应 Issue：
  - [Issue_20260621_Vitest_ElementPlus_Size_Warnings.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260621_Vitest_ElementPlus_Size_Warnings.md)

### 2. 管理端提现契约修复

- 修正 `rejectWithdrawal()` 请求体字段，统一使用后端实际接收的 `rejectReason`
- 管理端提现页改为复用 `getWithdrawals()`、`approveWithdrawal()`、`rejectWithdrawal()` API 封装
- 为 API 层和页面层补充提现拒绝链路回归测试
- 对应 Issue：
  - [Issue_20260621_Admin_Withdrawal_RejectReason_Contract.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260621_Admin_Withdrawal_RejectReason_Contract.md)

### 3. 练习试卷类型与抽题页稳定性

- 补齐 `ExercisePaper` 类型定义
- 将练习试卷详情、抽题相关 API 返回值改为强类型
- 新增 `exercise-draw` 页测，覆盖分类抽题、课时抽题、空参数和异常分支
- 修复 `exercise-draw.spec.ts` fake timers 未恢复导致的测试进程稳定性问题

### 4. 管理端订单查询契约收口

- 修正 `getAdminOrders()` 不再强制覆盖 `scope: 'others'`，保留页面实际传入的 `mine / others` 查询范围
- 管理端订单页改为复用 `getAdminOrders()` 与 `updatePrintStatus()` API 封装，移除对底层 `api` 的直接依赖
- 补充 API 层和页面层回归测试，覆盖订单范围切换与打印状态更新链路

### 5. Vitest worker 池稳定性修复

- 将 `frontend-web` 的 `npm test` 默认入口切换为 `--pool=threads`
- 在 `frontend-web/vitest.config.ts` 中显式固定 `test.pool = 'threads'`
- 基于当前 Windows 环境复测确认 `threads` 比默认 `forks` 更稳定，可作为日常回归默认配置
- 对应 Issue：
  - [Issue_20260621_Vitest_Forks_Worker_OOM.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260621_Vitest_Forks_Worker_OOM.md)

### 6. 管理端题库页 API 收口

- 管理端题库列表页与题目详情页改为复用共享 `admin` API 封装，移除对底层 `api` 的直接依赖
- 为 `getQuestions()` / `getQuestion()` 补齐题库列表与详情的返回类型约束
- 补充 API 层与页面层回归测试，覆盖题库列表加载、筛选重置、详情加载与删除返回链路

### 7. 上传页进度反馈补齐

- 为管理端文件上传页和教师贡献上传页补充上传进度展示
- 基于 `onUploadProgress` 同步百分比状态，上传成功后将进度稳定收敛到 `100%`
- 页测补充进度回调断言，覆盖上传成功后的表单重置与跳转链路

### 8. 管理端审核页 API 收口

- 管理端审核列表页与审核详情页改为复用共享 `admin` API 封装，移除对底层 `api` 的直接依赖
- 在 `frontend-web/src/api/modules/admin.ts` 新增 `getReviewDetail()`，并补齐审核列表/详情相关类型约束
- 审核详情页统一复用 `approveQuestion()` / `rejectQuestion()`，同时将知识点展示对齐为类型定义中的 `knowledgePoints`
- 补充 API 层与页面层回归测试，覆盖审核列表加载、详情加载、单条通过、单条拒绝与批量操作前置校验

### 9. 管理端定价页 API 收口

- 管理端定价页改为复用共享 `getPricing()` / `updatePricing()` API 封装，移除对底层 `api` 的直接依赖
- 为 `admin` API 模块补齐定价配置读写的类型约束，避免页面层继续吞掉 `any`
- 页面加载阶段补充默认值合并逻辑，确保后端返回字段不完整时仍能稳定渲染
- 补充 API 层与页面层回归测试，覆盖定价读取、默认值兜底与保存提交流程

### 10. 管理端上传与练习试卷页 API 收口

- 管理端文件上传页改为复用共享 `uploadFile()` API 封装，移除页面层对底层 `api` 的直接依赖
- 为 `uploadFile()` 补充可选请求配置透传，保留 `onUploadProgress` 等上传态回调能力，同时统一合并 multipart 请求头
- 管理端练习试卷上传流程改为复用共享 `adminCreatePaper()` API 封装，收口 `/admin/exercise/papers` 的 multipart 提交逻辑
- 补充 API 层与页面层回归测试，覆盖文件上传进度回调、练习试卷上传校验与成功提交流程

### 11. 收货地址页 API 收口

- 新增共享 `address` API 模块，集中收口收货地址列表、详情、新增、更新与删除接口
- 收货地址列表页与编辑页改为复用 `listAddresses()`、`getAddress()`、`createAddress()`、`updateAddress()`、`deleteAddress()`，移除页面层对底层 `api` 的直接依赖
- 在地址列表 API 层补充数组响应与 `{ list }` 包装响应的统一归一化，避免页面重复兼容后端返回结构
- 补充 API 层与页面层回归测试，覆盖地址列表加载、空态展示、删除刷新、编辑回填、新增提交与更新提交流程

### 12. 个人中心账户链路 API 收口

- 个人中心页、余额页、提现页改为复用共享 `auth` API 模块中的 `getUserStats()`、`getMyBalance()`、`withdraw()`，移除页面层对底层 `api` 的直接依赖
- 为 `auth` API 模块补齐 `UserProfile`、`UserStats`、`BalanceSummary` 类型约束，减少账户链路中的 `any` 透传
- 修复个人中心页账户菜单余额文案在异步余额回写后不刷新的问题，将菜单项改为基于响应式余额的 `computed` 派生
- 补充 API 层与页面层回归测试，覆盖用户统计读取、余额读取、提现校验、提现提交与管理员入口展示链路

### 13. 订单链路 API 收口

- 订单 store、订单列表页、订单详情页改为复用共享 `order` API 模块，移除对底层 `api` 的直接依赖
- 为 `order` API 模块补齐 `OrderType`、`OrderListParams`、`OrderListResponse` 类型约束，并修正创建订单类型以覆盖已在业务中使用的 `exercise`
- 订单详情页改为复用共享 `getOrder()`、`getOrderDownload()` 与 `exportDocx()`，统一下载订单与试卷导出链路的接口入口
- 补充 API 层、store 层与页面层回归测试，覆盖订单列表加载、分页透传、练习订单创建、下载链接获取、订单详情加载与导出流程

## 验证结果

- 定向测试：4 个测试文件、14 个用例通过
- `cd frontend-web && npm test`：45 个测试文件、158 个用例通过
- `cd frontend-web && npm run build`：通过

## 对应提交

- `62606b8` `test: share element plus input stubs`
- `aa2f29f` `fix: align withdrawal contract and exercise paper types`
- `343d922` `fix: align admin orders scope and api usage`
- `8bda911` `test: switch vitest pool to threads`
- `fbc06bf` `docs: update 20260621 web test bulletin`
- `fc5c403` `refactor: align admin question pages with api module`
- `516c0a9` `feat: add upload progress feedback`
- `6df9695` `refactor: align admin review pages with api module`
- `a234f64` `docs: record admin review contract fix`
- `f63e165` `refactor: align admin pricing page with api module`
- `d812823` `refactor: type admin knowledge and pricing apis`
- `77dd650` `refactor: align admin upload pages with api modules`
- `0b580e7` `refactor: align address pages with api module`
- `5f973d0` `refactor: align profile pages with auth api module`
- 本批提交：订单链路 API 收口
