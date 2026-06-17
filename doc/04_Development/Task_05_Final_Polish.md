# Task 05 — 收尾完善

**关联文档**：[Progress_Assessment_20260617](./Progress_Assessment_20260617.md)  
**当前状态**：整体 93%，前端 100%，后端代码 100%，356 tests pass  
**预估工时**：1 天

---

## 目标

1. 后端能启动，短信登录 + 支付宝端点可访问
2. 仪表盘 ECharts 图表
3. 端到端联调走通全链路
4. API 端点前后端对齐

---

## 1. 后端补齐 (1h)

### 1.1 安装缺失的 SDK (5min)

- [ ] `cd backend && npm install alipay-sdk @alicloud/dysmsapi20170525`
- [ ] 验证 `npm run build` 编译通过

### 1.2 后端启动验证 (15min)

- [ ] 删掉旧 dev.db：`rm backend/dev.db`
- [ ] `npm run start:dev`，确认无报错启动
- [ ] `curl http://localhost:3000/v1/health` → 200

### 1.3 短信端点验证 (20min)

- [ ] `POST /v1/auth/send-sms { phone: "13800138000" }` → Dev 模式控制台打印验证码
- [ ] `POST /v1/auth/login { phone: "13800138000", smsCode: "<控制台的验证码>" }` → 返回 JWT
- [ ] 首次登录自动创建用户 + role=teacher

### 1.4 支付宝端点验证 (15min)

- [ ] 确认 `alipay-sdk` 导入不报错
- [ ] Dev 模式（未配 ALIPAY_APP_ID）支付宝接口返回空表单，不崩溃
- [ ] `POST /v1/orders { paperId, type: "download" }` → 返回订单 + payment 字段

---

## 2. 仪表盘 ECharts (1h)

### 2.1 数据接入

- [ ] `admin/dashboard/index.vue` — 调 `GET /v1/admin/dashboard` 获取统计
- [ ] 显示真实数字：总题量 / 学科数 / 知识点数 / 待审核 / 今日订单 / 待处理打印

### 2.2 图表

- [ ] 安装 `echarts` + `vue-echarts`（如果还没装）
- [ ] 学科分布饼图
- [ ] 年级分布柱状图
- [ ] 难度分布饼图
- [ ] 图表响应窗口 resize

---

## 3. 端到端联调 (2h)

### 3.1 教师端全链路

- [ ] Dev 快捷登录 → 首页
- [ ] 首页点击「开始组卷」→ 配置页
- [ ] 选年级 + 科目 + 难度 + 题量 → 点击生成 → 进度条 → 跳转预览
- [ ] 预览页：前 5 题展示 + 截断遮罩
- [ ] 点击「下载试卷」→ 支付页 → 创建订单
- [ ] 余额支付（如有余额）→ 支付成功 → 跳订单详情
- [ ] 订单详情 → 导出/下载文件
- [ ] 历史订单列表 Tab 切换
- [ ] 个人中心 → 余额 → 提现
- [ ] 退出登录

### 3.2 管理后台全链路

- [ ] Dev 管理员登录
- [ ] 仪表盘：统计数字 + 图表正常
- [ ] 文件上传：选文件 + 学科年级 → 上传 → AI解析
- [ ] 入库审核：列表 + 单题通过/拒绝 + 批量操作
- [ ] 题库管理：6 维筛选 + 搜索 + 删除
- [ ] 知识点中心：列表 + 筛选
- [ ] 定价配置：编辑保存
- [ ] 订单管理：范围筛选 + Tab + 物流状态操作
- [ ] 提现管理：通过/拒绝

### 3.3 边缘情况

- [ ] 未登录访问 → 重定向 `/login`
- [ ] teacher 访问 `/admin/*` → 重定向 `/`
- [ ] 刷新页面 → Token 不丢
- [ ] 浏览器后退/前进 → 路由正确
- [ ] 空列表 → `el-empty` 正常
- [ ] 网络错误 → `ElMessage.error` 提示

---

## 4. API 端点对齐 (1h)

前端调用的 API → 逐项确认后端已实现：

| 前端调用 | 方法 | 端点 | 后端状态 |
|---------|------|------|---------|
| sendSms | POST | /v1/auth/send-sms | ✅ sms.controller |
| login | POST | /v1/auth/login | ✅ auth.controller |
| getProfile | GET | /v1/user/profile | ✅ user.controller |
| generatePaper | POST | /v1/paper/generate | ✅ paper.controller |
| getPaper | GET | /v1/paper/:id | 需确认 |
| getConfig/knowledgePoints | GET | /v1/knowledge-base/knowledge-points | 需确认路径 |
| createOrder | POST | /v1/orders | ✅ order.controller |
| getOrders | GET | /v1/orders | ✅ order.controller |
| getOrder | GET | /v1/orders/:id | ✅ order.controller |
| getOrderDownload | GET | /v1/orders/:id/download | 需确认 |
| payByBalance | POST | /v1/orders/:id/pay-by-balance | 需确认 |
| exportDocx | POST | /v1/paper/:id/export | 需确认 |
| getBalance | GET | /v1/balance | ✅ balance.controller |
| withdraw | POST | /v1/balance/withdraw | ✅ balance.controller |
| getPricing/public | GET | /v1/pricing/public | 需确认 |
| getAdmin/ dashboard/review/questions/knowledge/pricing/orders/withdrawals | GET | /v1/admin/* | ✅ admin.controller |
| shipping-addresses CRUD | CRUD | /v1/shipping-addresses | ✅ print module |
| contribution | CRUD | /v1/contribution | 需确认 |

- [ ] 逐项 curl 验证标记「需确认」的端点
- [ ] 路径不匹配的改前端或后端，统一对齐
- [ ] 响应格式确认：`{ code: 0, message: "ok", data: ... }`

---

## 5. 样式微调 (0.5h)

- [ ] 管理后台侧边栏选中高亮正确
- [ ] 顶部导航当前路由高亮
- [ ] Element Plus 主题色统一 `#1a6fb5`
- [ ] 表单最大宽度一致
- [ ] 列表页 `el-table` 高度、loading 状态
- [ ] 移动端 @media 降级（折叠导航、隐藏侧边栏）

---

## 验收标准

- [ ] 后端启动无报错，`/v1/health` 返回 200
- [ ] Dev 快捷登录 → 首页 → 组卷 → 预览 → 支付 → 导出 全链路走通
- [ ] 管理后台 10 个页面全部可用
- [ ] 仪表盘 ECharts 图表渲染正常
- [ ] 所有「需确认」的 API 端点已验证对齐
- [ ] 前端构建 0 错误
- [ ] 后端 356 tests 全过
- [ ] `curl` 验证 5 个核心端点：health / send-sms / login / generate / orders

---

> **这是最后一份任务文档。完成后项目代码侧 100% 就绪，甲方配好阿里云+支付宝 key 即可上线。**
