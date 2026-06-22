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

### 14. 题库贡献链路 API 收口

- 新增共享 `contribution` API 模块，集中收口题库贡献列表、详情、预览题目读取、提审与上传接口
- 题库贡献列表页、详情页、上传页、预览页改为复用共享 `contribution` API 模块，移除页面层对底层 `api` 的直接依赖
- 为题库贡献链路补齐 `ContributionItem`、`ContributionQuestion` 类型约束，并在 API 层统一归一化贡献列表与预览题目结构
- 补充 API 层与页面层回归测试，覆盖贡献列表加载、详情回显、上传进度回调、预览题目读取与提交审核流程

### 15. 支付与打印结算链路 API 收口

- 新增共享 `pricing` API 模块，并扩展 `payment` API 模块，集中收口公开定价、余额支付与 Mock 支付接口
- 支付页改为复用 `getMyBalance()`、`payByBalance()`、`payMock()` 与订单 store，移除页面层对底层 `api` 的直接依赖
- 打印结算页改为复用 `getPublicPricing()`、`listAddresses()`、`createOrder()`，统一串联定价、地址与下单链路
- 补充 API 层与页面层回归测试，覆盖公开定价读取、支付页订单创建与余额支付、打印结算页地址校验与打印订单创建流程

### 16. Paper 链路 API 收口

- `paper` store 改为复用共享 `paper` API 模块中的 `getKnowledgePoints()` 与 `generatePaper()`，移除 store 对底层 `api` 的直接依赖
- 试卷预览页改为复用共享 `pricing` API 模块中的 `getPublicPricing()`，统一下载与打印价格展示链路
- 练习试卷列表页改为复用共享 `exercise` API 模块中的 `getPapersByCategory()` 与 `getPapersByLesson()`，移除页面层对底层 `api` 的直接依赖
- 补强 `paper` / `exercise` API 返回类型与 store / 页面回归测试，覆盖知识点加载、试卷生成、试卷预览价格展示、练习试卷列表查询与跳转流程

### 17. 登录页 API 收口

- 登录页邮件验证码发送、邮箱注册、邮箱密码登录统一复用共享 `auth` API 模块，移除页面层对底层 `api` 的最后三处直接依赖
- 为 `auth` API 模块补齐 `sendEmailCode()`、`registerByEmail()`、`loginByPassword()`，并扩展登录响应类型以覆盖邮箱链路返回字段
- 更新登录页页面测试与 `auth` API 模块测试，覆盖邮件验证码发送、邮箱注册跳转、邮箱密码登录跳转三条回归链路

### 18. 个人中心统计契约对齐

- 新增 [Issue_20260622_Profile_Stats_Contract_Mismatch.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Profile_Stats_Contract_Mismatch.md)，记录个人中心统计口径与 `/users/me/stats` 实际契约不一致的问题
- 将前端 `auth` API 模块中的 `UserStats` 类型回归为后端真实字段：`totalPapers`、`totalPaid`、`todayRegenerates?`
- 个人中心页统计展示改为“已生成试卷 / 已支付订单 / 账户余额”，去除错误的“贡献题目”展示语义
- 更新 `profile` 页面测试与 `auth` API 测试，按真实接口契约回归断言

### 19. 鉴权资料契约与 Store 类型收口

- 新增 [Issue_20260622_Auth_Profile_Contract_Mismatch.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Auth_Profile_Contract_Mismatch.md)，记录 `UserProfile` 与 code 登录返回结构的前后端契约漂移
- 将前端 `auth` API 模块中的 `UserProfile` 对齐为后端 `/users/me` 真实返回字段，并为 code / Dev 登录补齐显式 `CodeLoginResponse`
- 移除 `auth` store 中 Dev 登录对 `(res as any).user` 的弱类型依赖，改为直接消费显式类型契约
- 重写 `auth` store 回归测试，覆盖 token 恢复、Dev 登录、资料回填、失败回退和退出登录链路

### 20. 支付页支付宝重试链路补齐

- 新增 [Issue_20260622_Alipay_Retry_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Alipay_Retry_Gap.md)，记录“订单已创建但首次支付单创建失败时，支付页无法重试支付宝支付”的链路缺口
- 支付页改为在本地缺少 `payForm` 时主动调用 `payAlipay(orderId)` 拉取支付表单，补齐支付宝重试链路
- 为 `payment` API 模块补齐 `AlipayPaymentResponse` 与 `PaymentStatusResponse`，修正 `checkPayStatus()` 的返回类型
- 对齐 `CreateOrderResult.payment` 的前端类型约束，允许后端返回 `payment: null` 与 `payForm: null`
- 新增 `payment` API 测试与支付页页面测试，覆盖支付宝重试拉单流程

### 21. 管理端提现与地址 API 收口

- 新增 [Issue_20260622_Admin_Address_Api_Duplication.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Address_Api_Duplication.md)，记录 `admin` API 模块重复维护地址接口及管理端提现字段漂移问题
- 为 `admin` API 模块补齐提现列表的显式类型：`AdminWithdrawalItem`、`AdminWithdrawalListParams`、`AdminWithdrawalListResponse`
- 管理端提现页改为直接消费共享 `admin` API 类型，移除页面层对返回结构的手工 `as` 断言
- 修复管理端提现页用户字段，从错误的 `userPhone` 对齐为后端实际返回的 `userName`
- 移除 `admin.ts` 中重复的地址接口声明，统一收口到共享 `address.ts` 模块

### 22. 练习管理 admin API 类型收口

- 新增 [Issue_20260622_Exercise_Admin_Dto_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Exercise_Admin_Dto_Gap.md)，记录后端练习管理分类/课时 CRUD 仍缺少显式 DTO 的问题
- 为前端 `exercise` API 模块补齐 `ExerciseCategory`、`ExerciseLesson`、分类/课时创建与更新 payload 类型，移除 admin CRUD 中的 `any`
- 重写 `admin/exercises` 页面脚本的本地状态类型，收紧分类、课时、试卷和对话框表单的结构约束
- 将分类编辑提交改为区分 create/update payload，避免把页面临时字段直接透传到更新接口
- 补充 `exercise` API 测试，覆盖后台分类/课时 CRUD 的 typed payload 提交

### 23. 余额契约与余额页展示对齐

- 新增 [Issue_20260622_Balance_Contract_Mismatch.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Balance_Contract_Mismatch.md)，记录余额汇总与余额流水接口长期缺少完整前端契约的问题
- 将前端 `auth` API 模块中的 `BalanceSummary` 对齐为后端真实返回结构：`balance`、`totalEarned`、`totalSpent`
- 为 `getBalanceLog()` 补齐余额流水 item、分页和查询参数类型，移除该接口的 `any` 返回值
- 余额页改为同时展示账户余额、累计收入与累计支出，补齐对真实接口字段的消费
- 更新 `auth` API 测试与余额页页面测试，覆盖余额汇总和余额流水参数提交断言

### 24. Dashboard 统计计数字段归一化

- 新增 [Issue_20260622_Dashboard_Count_Normalization_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Dashboard_Count_Normalization_Gap.md)，记录 dashboard 分布统计长期直接透出 SQL 原始字符串计数的问题
- 后端 `dashboard` 服务在返回前统一将 `bySubject`、`byGrade` 计数字段归一化为 number，和前端 `DashboardStats` 契约保持一致
- 强化 `dashboard.service` 单测，对学科和年级分布的返回值增加显式数值断言
- 管理端 dashboard 页面去掉图表数据映射中的局部 `any`，直接消费共享统计类型

### 25. 练习审核 admin 链路类型收口

- 新增 [Issue_20260622_Exercise_Contribution_Admin_Type_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Exercise_Contribution_Admin_Type_Gap.md)，记录练习审核 admin API 与页面长期缺少共享类型的问题
- 为 `exercise` API 模块补齐练习审核列表、审核通过/拒绝、批量审核的显式返回类型与 payload 类型
- 管理端 `admin/exercise-contributions` 页面改为直接消费共享分页与列表类型，移除局部 `any` 和弱类型断言
- 保留页面原有审核、批量审核、下载和分页行为，只收紧脚本契约和状态结构

### 26. 余额支付链路错误类型收口

- 新增 [Issue_20260622_Balance_Payment_Error_Type_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Balance_Payment_Error_Type_Gap.md)，记录余额支付与提现页仍在使用弱错误类型的问题
- 支付页改为用 `unknown` 接住创建订单、余额支付、Mock 支付异常，并通过最小错误识别逻辑保留原有提示与回退行为
- 提现页改为收口异常消息解析，移除 `error: any` 和直接可选链取 message 的弱类型写法
- 同时将余额支付可用性判断与订单类型标签函数补成显式类型，避免页面局部推断继续变宽

### 27. 订单列表行事件类型收口

- 新增 [Issue_20260622_Order_Row_Type_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Order_Row_Type_Gap.md)，记录订单列表页模板事件仍依赖弱类型行对象的问题
- 订单列表页将下载/打印表格的 `row-click` 事件收口为脚本内显式 typed handler，移除模板里的 `row: any`
- 标签页当前值与切换函数改为直接复用共享 `OrderType`，避免页面局部断言继续变宽

### 28. 管理端审核页错误类型收口

- 新增 [Issue_20260622_Admin_Review_Error_Type_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Review_Error_Type_Gap.md)，记录管理端审核列表页和详情页仍在使用弱错误类型的问题
- 审核列表页和审核详情页统一改为用 `unknown` 接住审核动作异常，并在页面内收口错误消息提取逻辑
- 保持原有“操作成功/失败”提示、刷新列表和返回上一页行为不变，只收紧错误分支类型

### 29. 管理端题目详情删除错误类型收口

- 新增 [Issue_20260622_Admin_Question_Detail_Error_Type_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Question_Detail_Error_Type_Gap.md)，记录管理端题目详情页删除动作仍在使用弱错误类型的问题
- 题目详情页删除动作改为用 `unknown` 接住异常，并在页面内收口最小错误消息提取逻辑
- 保持原有删除成功/失败提示和返回行为不变，只收紧错误分支类型

### 30. 管理端上传页错误类型收口

- 新增 [Issue_20260622_Admin_Upload_Error_Type_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Upload_Error_Type_Gap.md)，记录管理端上传页提交异常仍在使用弱错误类型的问题
- 上传页改为用 `unknown` 接住上传异常，并在页面内收口最小错误消息提取逻辑
- 保持原有上传进度和成功/失败提示行为不变，只收紧错误分支类型

### 31. 教师练习上传链路类型收口

- 新增 [Issue_20260622_Exercise_Upload_Teacher_Type_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Exercise_Upload_Teacher_Type_Gap.md)，记录教师练习上传页和详情页长期缺少共享类型的问题
- 为 `exercise` API 模块补齐教师练习上传创建结果、上传分类和上传课时的显式返回类型
- 教师练习上传页和练习详情页改为直接消费共享 `ExerciseCategory`、`ExerciseLesson`、`ExerciseUploadItem`，移除页面内的 `any` / `as any`
- 保持现有上传、分类联动、课时联动和详情展示行为不变

### 32. 地址编辑页错误类型收口

- 新增 [Issue_20260622_Address_Edit_Error_Type_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Address_Edit_Error_Type_Gap.md)，记录地址编辑页保存异常仍在使用弱错误类型的问题
- 地址编辑页改为使用 `unknown` 接住保存异常，并在页面内收口最小错误消息提取逻辑
- 保持原有表单校验、保存成功提示、保存失败提示与返回行为不变

### 33. 管理端订单页错误类型收口

- 新增 [Issue_20260622_Admin_Orders_Error_Type_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Orders_Error_Type_Gap.md)，记录管理端订单页状态更新异常仍在使用弱错误类型的问题
- 管理端订单页改为使用 `unknown` 接住状态更新异常，并在页面内收口最小错误消息提取逻辑
- 同时补齐订单列表响应归一化辅助逻辑的显式类型，保持原有筛选、刷新与状态流转行为不变

### 34. 管理端提现页异常处理收口

- 新增 [Issue_20260622_Admin_Withdrawals_Error_Handling_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Withdrawals_Error_Handling_Gap.md)，记录管理端提现页仍存在弱错误类型和静默失败的问题
- 提现管理页改为使用 `unknown` 接住审核异常，并在页面内收口最小错误消息提取逻辑
- 区分拒绝弹窗取消与接口失败，保持取消静默，同时补上失败提示
- 补充页面回归测试，覆盖拒绝提现请求失败时的错误提示行为

### 35. 题库贡献上传页错误类型收口

- 新增 [Issue_20260622_Contribute_Upload_Error_Type_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Contribute_Upload_Error_Type_Gap.md)，记录题库贡献上传页提交异常仍在使用弱错误类型的问题
- 题库贡献上传页改为使用 `unknown` 接住上传异常，并在页面内收口最小错误消息提取逻辑
- 补充页面回归测试，覆盖上传请求失败时的错误提示行为
- 保持原有上传进度、成功跳转与失败提示行为不变

### 36. 题库贡献预览页错误类型收口

- 新增 [Issue_20260622_Contribute_Preview_Error_Type_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Contribute_Preview_Error_Type_Gap.md)，记录题库贡献预览页提交异常仍在使用弱错误类型的问题
- 题库贡献预览页改为使用 `unknown` 接住提审异常，并在页面内收口最小错误消息提取逻辑
- 补充页面回归测试，覆盖提审请求失败时的错误提示行为
- 保持原有题目预览、提审成功跳转与失败提示行为不变

### 37. 打印结算页异常处理收口

- 新增 [Issue_20260622_Print_Checkout_Error_Handling_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Print_Checkout_Error_Handling_Gap.md)，记录打印结算页仍存在弱错误类型和服务端失败静默的问题
- 打印结算页改为使用 `unknown` 接住下单异常，并在页面内收口最小错误消息提取逻辑
- 区分网络失败兜底提示与服务端业务错误提示，避免后端返回业务错误时页面静默
- 补充页面回归测试，覆盖下单请求返回服务端错误消息时的提示行为
- 保持原有价格展示、地址选择、下单成功跳转行为不变

### 38. 练习首页标签类型收口

- 新增 [Issue_20260622_Exercises_Index_Tab_Type_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Exercises_Index_Tab_Type_Gap.md)，记录练习首页标签切换仍在使用弱类型断言的问题
- 练习首页为入口标签补齐显式联合类型和选项结构类型
- 模板标签切换改为使用 typed handler，移除 `as any`
- 同时整理页面脚本与模板命名，保持原有入口展示和跳转行为不变

### 39. 练习抽题页错误类型收口

- 新增 [Issue_20260622_Exercise_Draw_Error_Type_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Exercise_Draw_Error_Type_Gap.md)，记录练习抽题页错误解析仍在使用弱错误类型的问题
- 练习抽题页改为使用 `unknown` 接住抽题异常，并为错误解析收口最小结构类型
- 保持原有“暂无试卷 / 网络失败 / 服务异常”提示语义和下载、打印分流行为不变

### 40. 登录页静默失败收口

- 新增 [Issue_20260622_Login_Silent_Error_Handling_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Login_Silent_Error_Handling_Gap.md)，记录登录页多条认证链路仍存在静默失败的问题
- 登录页为短信发码、短信登录、邮箱发码、邮箱注册、邮箱登录和 Dev 登录统一收口最小错误消息提取逻辑
- 将空 `catch` 改为显式失败提示，保持原有校验、成功提示、倒计时和跳转行为不变
- 补充登录页回归测试，覆盖注册失败、邮箱发码失败、手机号登录失败、邮箱登录失败和 Dev 登录失败的提示行为

### 41. 管理端练习管理页静默失败收口

- 新增 [Issue_20260622_Admin_Exercises_Silent_Error_Handling_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Exercises_Silent_Error_Handling_Gap.md)，记录管理端练习管理页多条操作链路仍存在静默失败的问题
- 为删除分类、创建课时、删除课时、删除试卷等分支区分弹窗取消与接口失败
- 对真实失败补充明确错误提示，保持原有成功提示与刷新行为不变
- 补充页面回归测试，覆盖创建课时失败和删除分类失败的提示行为

### 42. 管理端练习审核页静默失败收口

- 新增 [Issue_20260622_Admin_Exercise_Contributions_Silent_Error_Handling_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Exercise_Contributions_Silent_Error_Handling_Gap.md)，记录管理端练习审核页多条操作链路仍存在静默失败的问题
- 为单条通过、单条拒绝和批量审核分支区分弹窗取消与接口失败
- 对真实失败补充明确错误提示，保持原有成功提示与列表刷新行为不变
- 补充页面回归测试，覆盖单条审核失败和批量审核失败的提示行为

### 43. 地址列表页静默失败收口

- 新增 [Issue_20260622_Address_List_Silent_Error_Handling_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Address_List_Silent_Error_Handling_Gap.md)，记录地址列表页仍存在静默失败的问题
- 为地址列表加载失败补充明确提示
- 为地址删除分支区分弹窗取消与接口失败，避免真实失败静默
- 补充页面回归测试，覆盖地址加载失败和删除地址失败的提示行为

### 44. 个人中心首页静默失败收口

- 新增 [Issue_20260622_Profile_Index_Silent_Error_Handling_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Profile_Index_Silent_Error_Handling_Gap.md)，记录个人中心首页数据加载链路仍存在静默失败的问题
- 为个人统计和账户余额加载补充明确失败提示
- 保持页面默认值兜底，避免渲染中断，同时保留现有入口、展示和跳转行为
- 补充页面回归测试，覆盖个人统计加载失败和余额加载失败的提示行为

### 45. 余额页静默失败收口

- 新增 [Issue_20260622_Profile_Balance_Silent_Error_Handling_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Profile_Balance_Silent_Error_Handling_Gap.md)，记录余额页汇总加载链路仍存在静默失败的问题
- 为余额汇总加载失败补充明确提示，避免用户把接口失败误判成余额为 0
- 保持页面默认值兜底和现有余额展示逻辑不变，避免渲染中断
- 补充页面回归测试，覆盖余额汇总加载失败时的提示行为

### 46. 提现页余额加载静默失败收口

- 新增 [Issue_20260622_Profile_Withdraw_Silent_Error_Handling_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Profile_Withdraw_Silent_Error_Handling_Gap.md)，记录提现页余额加载链路仍存在静默失败的问题
- 为提现页初始化余额加载失败补充明确提示，避免用户把接口异常误判成余额不足或余额为 0
- 保持现有提现校验、提交流程和默认值兜底不变，避免渲染中断
- 补充页面回归测试，覆盖余额加载失败时的提示行为

### 47. 支付页余额加载静默失败收口

- 新增 [Issue_20260622_Payment_Balance_Load_Silent_Error_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Payment_Balance_Load_Silent_Error_Gap.md)，记录支付页余额加载链路仍存在静默失败的问题
- 为支付页初始化余额加载失败补充明确提示，避免用户把接口异常误判成余额不足
- 保持原有订单创建、支付流程和默认值兜底不变，避免页面渲染中断
- 补充页面回归测试，覆盖余额加载失败时的提示行为

### 48. 试卷预览页价格加载静默失败收口

- 新增 [Issue_20260622_Paper_Preview_Pricing_Silent_Error_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Paper_Preview_Pricing_Silent_Error_Gap.md)，记录试卷预览页价格加载链路仍存在静默失败的问题
- 为公开定价加载失败补充明确提示，避免用户把接口异常误判成价格缺失
- 保持预览页分流入口、占位展示和页面渲染逻辑不变
- 补充页面回归测试，覆盖定价加载失败时的提示行为

### 49. 试卷预览测试夹具类型收口

- 为 `src/__tests__/pages/paper-preview.spec.ts` 提取带类型的试卷与题目夹具构造函数
- 去掉页面实例调用中的弱类型断言，减少测试维护时的隐式结构漂移风险
- 保持现有预览页行为断言和回归覆盖范围不变

### 50. 管理端定价配置页静默失败收口

- 新增 [Issue_20260622_Admin_Pricing_Silent_Error_Handling_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Pricing_Silent_Error_Handling_Gap.md)，记录管理端定价配置页仍存在静默失败分支的问题
- 为定价配置加载失败补充明确提示，避免后台误把接口异常当成默认配置
- 为保存操作区分弹窗取消与真实接口失败，对真实失败补充明确提示
- 补充页面回归测试，覆盖加载失败和保存失败时的提示行为

### 51. 打印下单页静默失败收口

- 新增 [Issue_20260622_Print_Checkout_Silent_Error_Handling_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Print_Checkout_Silent_Error_Handling_Gap.md)，记录打印下单页仍存在静默失败分支的问题
- 为打印定价和收货地址加载失败补充明确提示，避免用户把接口异常误判成无价格或无地址
- 保持页面默认值兜底与下单流程不变，并统一创建订单失败的兜底错误提示
- 补充页面回归测试，覆盖加载失败和订单创建失败时的提示行为

### 51. 打印下单页初始化静默失败收口

- 新增 [Issue_20260622_Print_Checkout_Load_Silent_Error_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Print_Checkout_Load_Silent_Error_Gap.md)，记录打印下单页初始化加载链路仍存在静默失败的问题
- 为打印定价和地址列表加载失败补充明确提示，避免用户把接口异常误判成无可用数据
- 保持页面当前兜底展示和提交流程不变，避免初始化异常导致渲染中断
- 补充页面回归测试，覆盖两个初始化请求失败时的提示行为

### 52. 打印下单测试夹具与兜底分支收口

- 为 `src/__tests__/pages/print-checkout.spec.ts` 提取带类型的定价、地址和订单夹具
- 去掉提交流程测试中的弱类型断言，降低打印下单页测试维护成本
- 补充“后端响应存在但缺少 message”时的兜底错误提示回归测试

### 53. 练习试卷上传页静默失败收口

- 新增 [Issue_20260622_Exercise_Upload_Silent_Error_Handling_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Exercise_Upload_Silent_Error_Handling_Gap.md)，记录练习试卷上传页仍存在静默失败分支的问题
- 为类目加载、课时加载和上传失败补充明确提示，避免用户把接口异常误判成无数据或无响应
- 保持现有空列表兜底和上传流程不变，避免页面交互被初始化失败阻断
- 补充页面回归测试，覆盖三个失败分支的提示行为

### 54. 管理端入库审核批量静默失败收口

- 新增 [Issue_20260622_Admin_Review_Batch_Silent_Error_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Review_Batch_Silent_Error_Gap.md)，记录管理端入库审核页仍存在批量静默失败分支的问题
- 为批量审核操作区分确认框取消与真实接口失败，对真实失败补充明确提示
- 保持单条审核、列表刷新与选中重置逻辑不变
- 补充页面回归测试，覆盖批量取消和批量失败分支

### 55. 组卷知识点 store 静默失败收口

- 新增 [Issue_20260622_Paper_Store_Knowledge_Points_Silent_Error_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Paper_Store_Knowledge_Points_Silent_Error_Gap.md)，记录组卷知识点 store 仍存在静默失败分支的问题
- 为知识点加载失败补充明确提示，并在失败时清空旧知识点列表
- 保持现有组卷条件、试卷生成与 store 结构不变
- 补充 store 回归测试，覆盖知识点加载失败分支

### 56. 地址编辑页加载静默跳回收口

- 新增 [Issue_20260622_Address_Edit_Load_Silent_Error_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Address_Edit_Load_Silent_Error_Gap.md)，记录地址编辑页仍存在加载失败静默跳回的问题
- 为编辑模式地址详情加载失败补充明确提示，避免用户只感知跳转却没有反馈
- 保持现有加载失败后返回上一页的行为不变
- 补充页面回归测试，覆盖加载失败分支，并顺手收口测试中的弱类型断言

### 57. 订单列表页下载失败兜底收口

- 新增 [Issue_20260622_Orders_Index_Download_Error_Fallback_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Orders_Index_Download_Error_Fallback_Gap.md)，记录订单列表页下载失败兜底提示仍不稳定的问题
- 为获取下载链接失败补充统一错误消息提取逻辑，保证无 message 时仍能给出明确提示
- 保持订单列表切换、跳转与下载成功行为不变
- 补充页面回归测试，覆盖下载失败兜底分支，并顺手收口测试中的弱类型断言

### 58. 订单详情页失败兜底收口

- 新增 [Issue_20260622_Order_Detail_Error_Fallback_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Order_Detail_Error_Fallback_Gap.md)，记录订单详情页加载与导出失败兜底提示仍不稳定的问题
- 为订单加载失败和导出失败补充统一错误消息提取逻辑，保证无 message 时仍能给出明确提示
- 保持详情页展示、下载与导出成功行为不变
- 补充页面回归测试，覆盖加载失败与导出失败兜底分支，并顺手收口测试中的弱类型断言

### 59. 认证 store 无效 token 旧态残留收口

- 新增 [Issue_20260622_Auth_Store_Invalid_Token_Stale_User_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Auth_Store_Invalid_Token_Stale_User_Gap.md)，记录认证 store 在无效 token 场景下可能残留旧用户态的问题
- 抽出统一认证清理逻辑，保证 token 缺失或无效时同步清理 user 和本地存储
- 保持现有登录、开发登录和登出行为不变
- 补充 store 回归测试，覆盖无效 token 初始化分支

### 60. 地址列表页测试类型收口

- 本批未发现新的产品缺陷，未新增 Issue
- 为 `src/__tests__/pages/address-list.spec.ts` 提取带类型的页面 VM 访问辅助，移除删除流程测试中的 `wrapper.vm as any`
- 收口确认弹窗桩返回值类型，移除 `ElMessageBox.confirm` 的弱类型断言
- 保持地址列表加载、删除刷新和删除失败提示行为不变

### 61. 管理端知识点页静默失败收口

- 新增 [Issue_20260622_Admin_Knowledge_Silent_Error_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Knowledge_Silent_Error_Gap.md)，记录管理端知识点中心加载失败仍会静默吞错的问题
- 为 `src/pages/admin/knowledge/index.vue` 补充统一错误消息提取逻辑，保证知识点加载失败时给出明确提示
- 在加载失败时清空当前知识点列表，避免用户把请求异常误判成真实空数据
- 为 `src/__tests__/pages/admin-knowledge.spec.ts` 提取带类型的页面 VM 访问辅助，并补充加载失败提示回归测试

### 62. 投稿中心列表静默失败收口

- 新增 [Issue_20260622_Contribute_Index_Silent_Error_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Contribute_Index_Silent_Error_Gap.md)，记录投稿中心题库与练习列表加载失败仍会静默吞错的问题
- 为 `src/pages/contribute/index.vue` 补充统一错误消息提取逻辑，保证题库贡献和练习试卷贡献加载失败时给出明确提示
- 在两条列表加载失败时清空当前列表，避免用户把请求异常误判成真实空态
- 为 `src/__tests__/pages/contribute-index.spec.ts` 提取带类型的页面 VM 访问辅助，并补充题库列表失败与练习列表失败回归测试

### 63. 投稿详情页静默失败收口

- 新增 [Issue_20260622_Contribute_Detail_Silent_Error_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Contribute_Detail_Silent_Error_Gap.md)，记录投稿详情页加载失败仍会静默吞错的问题
- 为 `src/pages/contribute/detail/index.vue` 补充统一错误消息提取逻辑，保证详情加载失败时给出明确提示
- 在详情加载失败时清空当前详情数据，避免旧态残留
- 为 `src/__tests__/pages/contribute-detail.spec.ts` 补充详情加载失败回归测试

### 64. 练习贡献详情页错误分支收口

- 新增 [Issue_20260622_Contribute_Exercise_Detail_Error_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Contribute_Exercise_Detail_Error_Gap.md)，记录练习贡献详情页加载失败提示过粗和删除失败被静默吞掉的问题
- 为 `src/pages/contribute/exercise-detail/index.vue` 补充统一错误消息提取逻辑，保证详情加载失败和删除失败时给出明确提示
- 在删除分支中区分确认框取消与真实接口失败，避免把删除失败误当成用户取消
- 为 `src/__tests__/pages/contribute-exercise-detail.spec.ts` 提取带类型的页面 VM 访问辅助，移除删除流程中的弱类型断言，并补充加载失败与删除失败回归测试

### 65. 题库贡献预览页加载静默失败收口

- 新增 [Issue_20260622_Contribute_Preview_Load_Silent_Error_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Contribute_Preview_Load_Silent_Error_Gap.md)，记录题库贡献预览页加载失败仍会静默吞错的问题
- 为 `src/pages/contribute/preview/index.vue` 补充统一错误消息提取逻辑，保证预览加载失败和提交失败都能给出明确提示
- 在预览加载失败时清空当前题目列表，避免旧态残留
- 为 `src/__tests__/pages/contribute-preview.spec.ts` 提取带类型的页面 VM 访问辅助，移除提交流程中的弱类型断言，并补充预览加载失败回归测试

### 66. 练习试卷列表页静默失败收口

- 新增 [Issue_20260622_Exercise_Papers_Silent_Error_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Exercise_Papers_Silent_Error_Gap.md)，记录练习试卷列表页加载失败仍会静默吞错的问题
- 为 `src/pages/exercises/papers/index.vue` 补充统一错误消息提取逻辑，保证按类目或课时加载试卷失败时给出明确提示
- 在加载失败时清空当前试卷列表，避免用户把请求异常误判成真实空态
- 为 `src/__tests__/pages/exercise-papers.spec.ts` 提取带类型的页面 VM 访问辅助，移除详情跳转中的弱类型断言，并补充加载失败回归测试

## 验证结果

- 定向测试：3 个测试文件、20 个用例通过
- 定向测试：2 个测试文件、12 个用例通过
- 定向测试：3 个测试文件、22 个用例通过
- 定向测试：2 个测试文件、7 个用例通过
- 定向测试：`src/__tests__/api/admin.spec.ts` 与 `src/__tests__/pages/admin-withdrawals.spec.ts` 在沙箱路径下触发 Vitest `setup.ts` 绝对路径解析异常，代码改动已通过全量回归验证
- 定向测试：2 个测试文件、18 个用例通过
- 定向测试：2 个测试文件、12 个用例通过
- 定向测试：`backend/src/modules/admin/services/dashboard.service.spec.ts` 与 `frontend-web/src/__tests__/pages/admin-dashboard.spec.ts` 通过
- 定向测试：`src/__tests__/api/exercise.spec.ts` 与 `src/__tests__/pages/admin-exercise-contributions.spec.ts` 通过
- 定向测试：`src/__tests__/pages/payment.spec.ts` 与 `src/__tests__/pages/profile-withdraw.spec.ts` 通过
- 定向测试：`src/__tests__/pages/orders-index.spec.ts` 通过
- 定向测试：`src/__tests__/pages/admin-review.spec.ts` 与 `src/__tests__/pages/admin-review-detail.spec.ts` 通过
- 定向测试：`src/__tests__/pages/admin-question-detail.spec.ts` 通过
- 定向测试：`src/__tests__/pages/admin-upload.spec.ts` 在沙箱路径下触发 Vitest `setup.ts` 绝对路径解析异常，代码改动已通过全量回归验证
- 定向测试：`src/__tests__/pages/exercise-upload.spec.ts` 与 `src/__tests__/pages/contribute-exercise-detail.spec.ts` 通过
- 定向测试：`src/__tests__/pages/address-edit.spec.ts` 通过
- 定向测试：`src/__tests__/pages/admin-orders.spec.ts` 通过
- 定向测试：`src/__tests__/pages/admin-withdrawals.spec.ts` 通过
- 定向测试：`src/__tests__/pages/contribute-upload.spec.ts` 通过
- 定向测试：`src/__tests__/pages/contribute-preview.spec.ts` 通过
- 定向测试：`src/__tests__/pages/print-checkout.spec.ts` 通过
- 定向测试：`src/__tests__/pages/exercises-index.spec.ts` 通过
- 定向测试：`src/__tests__/pages/exercise-draw.spec.ts` 在沙箱路径下触发 Vitest `setup.ts` 绝对路径解析异常，代码改动已通过全量回归验证
- 定向测试：`src/__tests__/pages/login.spec.ts` 通过
- 定向测试：`src/__tests__/pages/admin-exercises.spec.ts` 通过
- 定向测试：`src/__tests__/pages/admin-exercise-contributions.spec.ts` 通过
- 定向测试：`src/__tests__/pages/address-list.spec.ts` 通过
- 定向测试：`src/__tests__/pages/profile-index.spec.ts` 通过
- 定向测试：`src/__tests__/pages/profile-balance.spec.ts` 通过
- 定向测试：`src/__tests__/pages/profile-withdraw.spec.ts` 通过
- 定向测试：`src/__tests__/pages/payment.spec.ts` 通过
- 定向测试：`src/__tests__/pages/paper-preview.spec.ts` 通过
- 定向测试：`src/__tests__/pages/admin-pricing.spec.ts` 通过
- 定向测试：`src/__tests__/pages/print-checkout.spec.ts` 通过
- 定向测试：`src/__tests__/pages/exercise-upload.spec.ts` 通过
- 定向测试：`src/__tests__/pages/admin-review.spec.ts` 通过
- 定向测试：`src/__tests__/pages/address-list.spec.ts` 通过（5 个用例）
- 定向测试：`src/__tests__/pages/admin-knowledge.spec.ts` 通过（3 个用例）
- 定向测试：`src/__tests__/pages/contribute-index.spec.ts` 通过（3 个用例）
- 定向测试：`src/__tests__/pages/contribute-index.spec.ts` 通过（5 个用例）
- 定向测试：`src/__tests__/pages/contribute-detail.spec.ts` 在沙箱路径下触发 Vitest `setup.ts` 绝对路径解析异常，代码改动已通过全量回归验证
- 定向测试：`src/__tests__/pages/contribute-exercise-detail.spec.ts` 通过（5 个用例）
- 定向测试：`src/__tests__/pages/contribute-preview.spec.ts` 通过（4 个用例）
- 定向测试：`src/__tests__/pages/exercise-papers.spec.ts` 通过（5 个用例）
- `cd frontend-web && npm.cmd run build`：通过
- `cd frontend-web && npm.cmd test`：48 个测试文件、222 个用例通过
- `cd frontend-web && npm.cmd test`：48 个测试文件、223 个用例通过
- `cd frontend-web && npm.cmd test`：48 个测试文件、225 个用例通过
- `cd frontend-web && npm.cmd test`：48 个测试文件、226 个用例通过
- `cd frontend-web && npm.cmd test`：48 个测试文件、228 个用例通过
- `cd frontend-web && npm.cmd test`：48 个测试文件、229 个用例通过
- `cd frontend-web && npm.cmd test`：48 个测试文件、230 个用例通过
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
- `436a2d8` `refactor: align order pages with api modules`
- `0423ee6` `refactor: align contribution pages with api module`
- `ff227ca` `refactor: align payment pages with api modules`
- 本批提交：Paper 链路 API 收口
- `c483dac` `refactor: tighten profile balance errors`
- `a3ccec4` `refactor: tighten profile withdraw errors`
- `9248949` `refactor: tighten payment balance load errors`
- 本批提交：试卷预览页价格加载静默失败收口
- 本批提交：试卷预览测试夹具类型收口
- `c381677` `refactor: tighten admin pricing errors`
- `e5ff392` `refactor: tighten print checkout load errors`
- `b02aa0c` `test: type print checkout fixtures`
- 本批提交：练习试卷上传页静默失败收口
- 本批提交：管理端入库审核批量静默失败收口
- 本批提交：组卷知识点 store 静默失败收口
- 本批提交：地址编辑页加载静默跳回收口
- 本批提交：订单链路失败兜底收口
- 本批提交：认证 store 无效 token 旧态残留收口
