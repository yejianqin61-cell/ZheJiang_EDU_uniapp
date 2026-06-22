# 开发公报 - 2026-06-22

## 本轮收口

### 1. 管理端提现页错误处理回归补齐

- 对应 Issue：
  - [Issue_20260622_Admin_Withdrawals_Error_Handling_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Withdrawals_Error_Handling_Gap.md)
- `frontend-web/src/pages/admin/withdrawals/index.vue`
  - 列表加载失败时不再静默吞错，改为清空当前列表并提示明确错误信息
  - 审核通过、审核拒绝统一复用带兜底文案的错误消息提取逻辑
- `frontend-web/src/__tests__/pages/admin-withdrawals.spec.ts`
  - 移除拒绝弹窗结果和页面方法调用中的 `as any`
  - 补充“提现列表首次加载失败会提示错误”的回归用例

### 2. 管理端练习模块测试弱类型收口

- 对应 Issue：
  - [Issue_20260622_Admin_Test_AsAny_Backlog.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Test_AsAny_Backlog.md)
- `frontend-web/src/__tests__/pages/admin-exercise-contributions.spec.ts`
  - 为页面 VM 访问补齐显式类型辅助，移除单条审核、批量审核和选中状态断言中的 `as any`
  - 为批量拒绝弹窗结果补齐 `MessageBoxData` 类型桩
- `frontend-web/src/__tests__/pages/admin-exercises.spec.ts`
  - 为年级、学科、分类弹窗表单和上传表单补齐显式测试类型
  - 移除分类保存、课时创建、分类删除、上传提交流程中的 `as any`
  - 统一复用带类型的弹窗结果构造辅助，降低后续维护时的弱类型漂移风险

### 3. 管理端上传与审核详情测试弱类型收口

- 对应 Issue：
  - [Issue_20260622_Admin_Test_AsAny_Backlog.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Test_AsAny_Backlog.md)
- `frontend-web/src/__tests__/pages/admin-upload.spec.ts`
  - 为页面 VM、上传表单和文件状态补齐显式测试类型
  - 为 `onUploadProgress` 回调桩补齐 `AxiosProgressEvent` 类型，移除上传进度模拟中的 `as any`
- `frontend-web/src/__tests__/pages/admin-review-detail.spec.ts`
  - 为审核详情页的通过/拒绝动作补齐显式页面方法类型辅助
  - 移除页面方法调用中的 `as any`

### 4. 管理端练习审核列表加载静默失败收口

- 对应 Issue：
  - [Issue_20260622_Admin_Exercise_Contributions_Silent_Error_Handling_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Exercise_Contributions_Silent_Error_Handling_Gap.md)
- `frontend-web/src/pages/admin/exercise-contributions/index.vue`
  - 练习审核列表加载失败时不再静默吞错，改为清空当前列表并提示明确错误信息
  - 保持单条审核、批量审核的成功提示与刷新行为不变
- `frontend-web/src/__tests__/pages/admin-exercise-contributions.spec.ts`
  - 补充“练习审核列表首次加载失败会提示错误并清空列表”的回归用例

### 5. 支付页支付宝分支错误类型收口

- 对应 Issue：
  - [Issue_20260622_Balance_Payment_Error_Type_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Balance_Payment_Error_Type_Gap.md)
- `frontend-web/src/pages/payment/index.vue`
  - 支付宝支付分支统一复用页面内的错误消息提取逻辑，避免支付异常继续退化为无类型兜底
  - 保持原有“支付失败”兜底文案与支付流程不变
- `frontend-web/src/__tests__/pages/payment.spec.ts`
  - 移除支付宝表单提交桩中的 `as any`
  - 补充“支付宝拉单失败会提示真实错误信息”的回归用例

### 6. 组卷配置页生成失败静默收口

- 对应 Issue：
  - [Issue_20260622_Paper_Config_Generate_Silent_Error_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Paper_Config_Generate_Silent_Error_Gap.md)
- `frontend-web/src/pages/paper/config/index.vue`
  - 组卷失败时不再静默停留，改为提示明确错误信息
  - 保持失败后关闭生成弹窗、留在当前配置页的原有行为不变
- `frontend-web/src/__tests__/pages/paper-config.spec.ts`
  - 重写页面 VM 访问为显式类型辅助，移除该文件中的 `as any`
  - 补充“组卷失败会提示错误并留在配置页”的回归用例

### 7. 管理端仪表盘首屏加载静默失败收口

- 对应 Issue：
  - [Issue_20260622_Admin_Dashboard_Silent_Error_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Dashboard_Silent_Error_Gap.md)
- `frontend-web/src/pages/admin/dashboard/index.vue`
  - 仪表盘统计加载失败时不再静默吞错，改为提示明确错误信息
  - 保持默认统计值兜底和图表初始化逻辑不变，避免首屏渲染中断
- `frontend-web/src/__tests__/pages/admin-dashboard.spec.ts`
  - 补充“仪表盘首屏加载失败会提示错误”的回归用例

### 8. 练习类目页加载失败与弱类型收口

- 对应 Issue：
  - [Issue_20260622_Exercise_Category_Silent_Error_Gap.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Exercise_Category_Silent_Error_Gap.md)
- `frontend-web/src/pages/exercises/category.vue`
  - 重写压缩脚本为可维护结构，并将类目、课时状态收为显式类型
  - 为类目加载失败和同步课时加载失败统一补充错误消息提取与状态清理
- `frontend-web/src/__tests__/pages/exercise-category.spec.ts`
  - 新增练习类目页回归测试，覆盖类目加载、类目失败、同步课时部分失败三条链路

### 9. 练习与首页页测弱类型收口

- 对应 Issue：
  - [Issue_20260622_Admin_Test_AsAny_Backlog.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Test_AsAny_Backlog.md)
- `frontend-web/src/__tests__/pages/home.spec.ts`
  - 为首页“开始组卷”入口补齐显式页面方法类型辅助，移除 `as any`
- `frontend-web/src/__tests__/pages/exercises-index.spec.ts`
  - 为练习入口页的年级、学科和模式状态补齐显式页面 VM 类型
- `frontend-web/src/__tests__/pages/exercise-draw.spec.ts`
  - 为练习抽卷页下载/打印分流动作补齐显式页面方法类型辅助
  - 移除页面方法调用中的 `as any`

### 10. 贡献上传页测弱类型收口

- 对应 Issue：
  - [Issue_20260622_Admin_Test_AsAny_Backlog.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Test_AsAny_Backlog.md)
- `frontend-web/src/__tests__/pages/contribute-upload.spec.ts`
  - 为贡献上传页表单状态、页面提交方法和上传进度回调补齐显式类型
  - 移除提交动作、表单赋值和进度事件模拟中的 `as any`

### 11. Store 与 API 测试弱类型尾项收口

- 对应 Issue：
  - [Issue_20260622_Admin_Test_AsAny_Backlog.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Admin_Test_AsAny_Backlog.md)
- `frontend-web/src/__tests__/stores/auth.spec.ts`
  - 将 `window.location` getter 桩从 `as any` 收为显式 `Location` 类型断言
- `frontend-web/src/__tests__/api/admin.spec.ts`
  - 为 `updatePricing()` 的请求体补齐 `PricingConfig` 显式类型
  - 移除 API 层测试中的 `payload as any`

## 验证结果

- `cd frontend-web && npm.cmd test -- src/__tests__/pages/admin-withdrawals.spec.ts`：1 个测试文件、5 个用例通过
- `cd frontend-web && npm.cmd test -- src/__tests__/pages/admin-exercise-contributions.spec.ts src/__tests__/pages/admin-exercises.spec.ts`：2 个测试文件、12 个用例通过
- `cd frontend-web && npm.cmd test -- src/__tests__/pages/admin-upload.spec.ts src/__tests__/pages/admin-review-detail.spec.ts`：2 个测试文件、6 个用例通过
- `cd frontend-web && npm.cmd test -- src/__tests__/pages/admin-exercise-contributions.spec.ts`：1 个测试文件、6 个用例通过
- `cd frontend-web && npm.cmd test -- src/__tests__/pages/payment.spec.ts`：1 个测试文件、6 个用例通过
- `cd frontend-web && npm.cmd test -- src/__tests__/pages/paper-config.spec.ts`：1 个测试文件、4 个用例通过
- `cd frontend-web && npm.cmd test -- src/__tests__/pages/admin-dashboard.spec.ts`：1 个测试文件、3 个用例通过
- `cd frontend-web && npm.cmd test -- src/__tests__/pages/exercise-category.spec.ts`：1 个测试文件、3 个用例通过
- `cd frontend-web && npm.cmd test -- src/__tests__/pages/home.spec.ts src/__tests__/pages/exercises-index.spec.ts src/__tests__/pages/exercise-draw.spec.ts`：3 个测试文件、9 个用例通过
- `cd frontend-web && npm.cmd test -- src/__tests__/pages/contribute-upload.spec.ts`：1 个测试文件、4 个用例通过
- `cd frontend-web && npm.cmd test -- src/__tests__/stores/auth.spec.ts src/__tests__/api/admin.spec.ts`：2 个测试文件、21 个用例通过
- `cd backend && npm.cmd test -- src/modules/auth/services/sms.service.spec.ts`：1 个测试文件、9 个用例通过
- `cd backend && npm.cmd test -- src/modules/auth/services/sms.service.spec.ts src/modules/auth/auth.service.spec.ts src/modules/auth/auth.controller.spec.ts`：3 个测试文件、29 个用例通过
- `cd backend && npm.cmd test -- src/modules/order/order.service.spec.ts`：1 个测试文件、16 个用例通过
- `cd backend && npm.cmd test -- src/modules/exercise-contribution/services/exercise-contribution.service.spec.ts`：1 个测试文件、9 个用例通过
- `cd backend && npm.cmd test -- src/modules/knowledge-base/services/review.service.spec.ts`：1 个测试文件、8 个用例通过

### 12. 短信发送失败显式报错与状态回滚

- 对应 Issue：
  - [Issue_20260622_Backend_Silent_Error_Cleanup_Backlog.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Backend_Silent_Error_Cleanup_Backlog.md)
- `backend/src/modules/auth/services/sms.service.ts`
  - 为短信服务补充 `Logger`，阿里云短信发送失败时记录明确错误日志，避免线上异常继续静默吞掉
  - 将短信供应商异常从“假成功”改为显式 `502` 返回，并同步回滚验证码与频控状态，避免用户未收到验证码却被误判为已发送
- `backend/src/modules/auth/services/sms.service.spec.ts`
  - 新增“短信供应商发送失败时回滚状态并抛出明确错误”的回归用例
  - 校验失败场景下日志记录、验证码缓存和发送频控缓存都被正确清理

### 13. 订单练习试卷回退查询告警补齐

- 对应 Issue：
  - [Issue_20260622_Backend_Silent_Error_Cleanup_Backlog.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Backend_Silent_Error_Cleanup_Backlog.md)
- `backend/src/modules/order/order.service.ts`
  - 为订单列表和详情里的练习试卷回退查询补充 `Logger` 告警，避免科目回退、标题回退失败时继续静默
  - 保持原有兜底行为不变，查询异常时仍返回空标题或现有列表结果，不影响甲方当前下单与查单主流程
- `backend/src/modules/order/order.service.spec.ts`
  - 新增练习科目回退失败、订单列表标题回退失败、订单详情标题回退失败三条回归用例
  - 校验异常场景下服务会记录明确告警，并继续按现有兜底结果返回

### 14. 练习试卷上传与返现静默失败收口

- 对应 Issue：
  - [Issue_20260622_Backend_Silent_Error_Cleanup_Backlog.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Backend_Silent_Error_Cleanup_Backlog.md)
- `backend/src/modules/exercise-contribution/services/exercise-contribution.service.ts`
  - 为缩略图异步生成失败补充明确告警，避免上传后缩略图链路继续静默失败
  - 为审核通过后的教师返现失败补充明确告警，保持审核主流程不中断，但后台可追踪补偿
- `backend/src/modules/exercise-contribution/services/exercise-contribution.service.spec.ts`
  - 新增“缩略图生成失败仍上传成功并记录告警”“返现失败仍审核成功并记录告警”两条回归用例
  - 通过文件系统桩避免测试写入本地上传产物，保证该组单测纯净可重复

### 15. 知识库审核返现静默失败收口

- 对应 Issue：
  - [Issue_20260622_Backend_Silent_Error_Cleanup_Backlog.md](/C:/Users/USER/Desktop/浙江ai组卷uniapp/doc/04_Development/Issue_20260622_Backend_Silent_Error_Cleanup_Backlog.md)
- `backend/src/modules/knowledge-base/services/review.service.ts`
  - 为教师题目录入审核通过后的返现失败补充明确告警，避免补贴链路继续静默吞掉
  - 保持审核主流程成功逻辑不变，返现异常时仍完成审核，但后台可追踪后续补偿
- `backend/src/modules/knowledge-base/services/review.service.spec.ts`
  - 新增“返现失败仍审核成功并记录告警”的回归用例
  - 校验审核统计结果不受影响，同时确实留下可追踪的告警日志
