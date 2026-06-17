# Task 02 — 前端页面迁移

**关联文档**：[Task_01](./Task_01_Frontend_Infrastructure.md) · [Blueprint](../03_Design/Web_Migration_Blueprint.md)  
**前置依赖**：Task 01 完成（布局 + 路由 + API 层可用）  
**预估工时**：4 天

---

## 目标

将旧 `frontend/` 中所有页面的业务逻辑迁移到新 `frontend-web/`，UI 层全面改写为标准 HTML + Element Plus 组件。

### 迁移原则

1. **业务逻辑保留** — `<script setup>` 中的逻辑尽量原样搬，只改 API 调用路径
2. **模板全面重写** — UniApp 组件 (`<view>` `<text>` `<picker>` `<slider>` `<button>`) → HTML + Element Plus
3. **样式重写** — `rpx` → `px`（数值 ÷ 2），布局改为 1200px 居中容器
4. **事件改写** — `@tap` → `@click`，`onLoad` → `useRoute + onMounted`
5. **Toast/Modal** — `uni.showToast` → `ElMessage`，`uni.showModal` → `ElMessageBox`

---

## Day 1：教师端核心流程 (8 页)

### 1. 首页 `pages/index/index.vue` (1.5h)

旧文件参考：`frontend-legacy/src/pages/index/index.vue`

- [ ] PC 首页布局：Hero 区（标题 + 副标题 + 开始组卷按钮）+ 功能卡片区
- [ ] 功能卡片：AI智能组卷 / 我的订单 / 教师贡献 / 打印服务
- [ ] 统计数字：已有 N 题、覆盖 N 学科、服务 N 位教师
- [ ] 如果已登录 →「开始组卷」跳 `/paper/config`
- [ ] 如果未登录 →「开始组卷」跳 `/login`
- [ ] `@tap` → `@click` 全局替换
- [ ] `uni.navigateTo` → `router.push`

### 2. 组卷配置 `pages/paper/config/index.vue` (1h)

旧文件参考：`frontend-legacy/src/pages/paper/config/index.vue`

- [ ] 学段/年级选择：`<picker>` → `<el-select>` + `<el-option>`
- [ ] 科目选择：`<picker>` → `<el-select>`（九科联动）
- [ ] 知识点多选：`<el-checkbox-group>` + `<el-checkbox-button>`
- [ ] 难度选择：`<el-radio-group>`
- [ ] 题量设置：`<slider>` → `<el-slider :min="1" :max="50">` + 数字输入框
- [ ] 开始组卷按钮 → 调 API → loading → 跳 `/paper/preview`
- [ ] 保留旧业务逻辑：`getConfig()` / `generatePaper()` 函数逻辑不变

### 3. 试卷预览 `pages/paper/preview/index.vue` (1.5h)

旧文件参考：`frontend-legacy/src/pages/paper/preview/index.vue`

- [ ] 试卷标题 + 总分 + 题量
- [ ] 前 5 题免费预览（题目 + 选项，不显示答案/解析/难度）
- [ ] 超出部分截断遮罩：「支付后查看完整试卷」
- [ ] 底部两个服务卡片（分流入口）：
  - 📥 下载服务 — 价格 → 去支付（跳 `/payment?type=download`）
  - 🖨️ 打印服务 — 价格 → 去下单（跳 `/print/checkout`）
- [ ] 题目卡片组件 `QuestionCard.vue`

### 4. 支付确认 `pages/payment/index.vue` (1h)

旧文件参考：`frontend-legacy/src/pages/payment/index.vue`

- [ ] 订单摘要：试卷名称、题量、金额
- [ ] 支付方式：支付宝（默认选中）
- [ ] 确认支付按钮 → `POST /v1/orders` → 获取支付宝表单 HTML
- [ ] 自动提交表单或展示二维码 → 跳转支付宝收银台
- [ ] 支付结果轮询（每 2 秒查一次，最多 5 分钟）
- [ ] 支付成功 → 跳订单详情或下载页

### 5. 历史订单 `pages/orders/index.vue` (1h)

旧文件参考：`frontend-legacy/src/pages/orders/index.vue`

- [ ] `el-tabs` 双栏：下载服务 | 打印服务
- [ ] 下载 Tab：订单卡片/表格 + 下载按钮（`window.open`）
- [ ] 打印 Tab：订单卡片/表格 + 物流状态标签
- [ ] 分页（`el-pagination`）
- [ ] 空状态（`el-empty`）

### 6. 订单详情 `pages/orders/detail/index.vue` (0.5h)

旧文件参考：`frontend-legacy/src/pages/orders/detail/index.vue`

- [ ] 下载订单：试卷信息 + 金额 + 下载按钮
- [ ] 打印订单：试卷信息 + 金额 + 收货地址 + 物流时间线（`el-timeline`）
- [ ] 重复下载功能

### 7. 个人中心 `pages/profile/index.vue` (0.5h)

旧文件参考：`frontend-legacy/src/pages/profile/index.vue`

- [ ] 用户信息卡片（手机号后四位 + 角色标签）
- [ ] 功能菜单：我的余额 / 提现 / 我的贡献 / 收货地址
- [ ] 退出登录按钮 → `authStore.logout()`

### 8. 余额 / 提现 (1h)

旧文件参考：`frontend-legacy/src/pages/profile/balance/` 和 `withdraw/`

- [ ] 余额页 `profile/balance/index.vue`：余额数字 + 交易记录列表
- [ ] 提现页 `profile/withdraw/index.vue`：金额输入 + 提交按钮

---

## Day 2：教师端辅助流程 + 打印/地址 (8 页)

### 9. 教师贡献 `pages/contribute/` (3 页, 1.5h)

旧文件参考：`frontend-legacy/src/pages/contribute/`

- [ ] `contribute/index.vue`：贡献列表（待审核 / 已入库 / 已驳回）+ 上传入口
- [ ] `contribute/upload/index.vue`：
  - `<input type="file">` 选择文件（替代 `uni.chooseFile` / `uni.chooseMessageFile`）
  - 学科/年级选择（`el-select`）
  - 上传按钮 + 进度条
- [ ] `contribute/preview/index.vue`：AI 解析结果预览 + 提交审核按钮
- [ ] `contribute/detail/index.vue`：贡献详情 + 审核状态 + 返现金额

### 10. 打印结算 `pages/print/checkout/index.vue` (1h)

旧文件参考：`frontend-legacy/src/pages/print/checkout/index.vue`

- [ ] 试卷信息展示
- [ ] 份数选择器（`el-input-number`）
- [ ] 分档计费表格（当前档位高亮）
- [ ] 收货地址选择（已存地址列表 + 新增入口）
- [ ] 费用明细 + 确认支付按钮

### 11. 收货地址 `pages/address/` (2 页, 1h)

旧文件参考：`frontend-legacy/src/pages/address/`

- [ ] `address/list/index.vue`：地址卡片列表 + 默认标记 + 编辑/删除
- [ ] `address/edit/index.vue`：
  - 收货人 + 手机号 + 省市区（`el-cascader` 或三个 `el-select`）+ 详细地址（`el-input type="textarea"`）
  - 设为默认地址（`el-switch`）
  - 保存按钮

### 12. 打印订单详情 (0.5h)

旧文件参考：`frontend-legacy/src/pages/orders/detail/index.vue`（打印模式分支）

- [ ] 已在 Task 02-6 的订单详情页中一并处理

---

## Day 3：管理后台 (10 页)

### 13. 仪表盘 `admin/dashboard/index.vue` (1h)

旧文件参考：`frontend-legacy/src/pages/admin/dashboard/index.vue`

- [ ] 统计卡片行：总题量 / 学科数 / 知识点数 / 待审核数 / 今日订单 / 待处理打印
- [ ] ECharts 图表：学科饼图 + 年级柱状图 + 难度饼图（直接引入，无需条件编译）
- [ ] 从 `api/modules/admin.ts` 获取数据

### 14. 文件上传 `admin/upload/index.vue` (1h)

旧文件参考：`frontend-legacy/src/pages/admin/upload/index.vue`

- [ ] `el-upload` 组件（替代 `uni.chooseMessageFile`）
- [ ] 学科/年级选择（`el-select`）
- [ ] 上传进度条（`el-progress`）
- [ ] 上传完成后跳转到审核页 或 显示「AI 解析中」状态

### 15. 入库审核 `admin/review/` (2 页, 1.5h)

旧文件参考：`frontend-legacy/src/pages/admin/review/`

- [ ] `review/index.vue`：
  - `el-table` 待审核列表（题目摘要/学科/年级/知识点/难度/来源）
  - 批量操作工具栏：全选 / 反选 / 批量通过 / 批量拒绝
  - 分页
- [ ] `review/detail/index.vue`：
  - 题目完整信息（题型/题干/选项/答案/解析/知识点/难度）
  - 通过 / 拒绝按钮

### 16. 题库管理 `admin/questions/` (2 页, 1.5h)

旧文件参考：`frontend-legacy/src/pages/admin/questions/`

- [ ] `questions/index.vue`：
  - 筛选行：学科（`el-select`）+ 年级（`el-select`）+ 知识点（`el-select`）+ 难度（`el-select`）+ 关键词搜索（`el-input` + 搜索按钮）+ 重置按钮
  - `el-table` 题目列表 + 分页
  - 批量删除 + 单题删除（二次确认弹窗）
  - 题型标签（`el-tag`）
- [ ] `questions/detail/index.vue`：
  - 题目完整信息 + 关联知识点 + 来源文件
  - 编辑/删除按钮

### 17. 知识点中心 `admin/knowledge/index.vue` (0.5h)

旧文件参考：`frontend-legacy/src/pages/admin/knowledge/index.vue`

- [ ] 筛选行：学科 + 年级
- [ ] `el-table`：知识点名称 / 学科 / 年级 / 关联题目数
- [ ] 只读（无编辑/删除）

### 18. 定价配置 `admin/pricing/index.vue` (0.5h)

旧文件参考：`frontend-legacy/src/pages/admin/pricing/index.vue`

- [ ] 下载服务定价：`el-input-number` 单题价格（元）
- [ ] 打印服务三档定价：份数范围 + 单价（元/份）
- [ ] 档位连续性校验（前端 + 后端双重校验）
- [ ] 保存按钮 + 二次确认

### 19. 订单管理 `admin/orders/index.vue` (1h)

旧文件参考：`frontend-legacy/src/pages/admin/orders/index.vue`

- [ ] 范围筛选（`el-radio-group`）：我的订单 / 所有用户订单
- [ ] Tab 切换：下载服务 / 打印服务
- [ ] 下载 Tab：订单表格（只读 + 无下载按钮）
- [ ] 打印 Tab：订单表格 + 物流状态操作按钮（标记打印中/已发货/已签收）
- [ ] 分页

### 20. 提现管理 `admin/withdrawals/index.vue` (0.5h)

旧文件参考：`frontend-legacy/src/pages/admin/withdrawals/index.vue`

- [ ] 提现申请列表（用户/金额/时间/状态）
- [ ] 通过按钮 → 调接口
- [ ] 拒绝按钮 → 弹窗输入拒绝原因

---

## Day 4：组件抽取 + 样式打磨 (缓冲日)

### 21. 通用组件抽取

- [ ] `QuestionCard.vue` — 题目卡片（试卷预览、审核详情、题库详情共用）
- [ ] `OrderCard.vue` / `OrderTable.vue` — 订单展示（订单列表、管理端共用）
- [ ] `PageHeader.vue` — 页面标题 + 面包屑
- [ ] `EmptyState.vue` — 空状态（列表无数据时展示）

### 22. 样式统一

- [ ] 12 个页面的 `rpx` → `px` 全部检查
- [ ] `@tap` → `@click` 全局无遗漏
- [ ] Element Plus 主题色统一（`el-button--primary` / `el-tag` 等颜色）
- [ ] 表单宽度统一（`el-input` / `el-select` 最大宽度）

### 23. 响应式补充（可选）

- [ ] `@media (max-width: 768px)` — 移动端降级：导航栏改为折叠菜单、侧边栏隐藏

---

## 验收标准

- [ ] 教师端全流程走通：登录 → 首页 → 组卷配置 → AI组卷 → 试卷预览 → 支付 → 下载
- [ ] 打印流程走通：试卷预览 → 选择打印 → 填地址 → 确认支付
- [ ] 管理后台全部页面可访问，功能可用
- [ ] 所有 `uni.*` API 调用已替换（全局搜索 `uni.` 无结果）
- [ ] 所有 `@tap` 已替换为 `@click`
- [ ] 所有 `rpx` 已替换为 `px`
- [ ] `#ifdef` / `#ifndef` 全部删除
- [ ] 页面在 1920×1080 和 1366×768 分辨率下布局正常
