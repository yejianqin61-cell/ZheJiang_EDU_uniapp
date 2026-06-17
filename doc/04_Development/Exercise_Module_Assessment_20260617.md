# Task 07 练习模块 — 开发自评估

Version 1.0 | 2026-06-17

---

## 一、整体评估

```
████████████████████████████████████░░░░░░░░░░  75%
```

| 维度 | 完成度 | 说明 |
|------|--------|------|
| 数据库 | **100%** | 4 张表，迁移 SQL 就绪 |
| 后端 CRUD | **100%** | 类目/课时/试卷完整 CRUD + 随机抽取 |
| 后端测试 | **0%** | 未写，至少需要 20 tests |
| 用户端前端 | **85%** | 3 页完成，但未联调验证 |
| 管理端前端 | **80%** | 1 页完成，文件上传流程有 bug |
| 缩略图生成 | **70%** | Python 端点存在，但后端上传时未调用 |
| 订单+支付 | **60%** | 核心逻辑通了，但 Exercise paper 的 paperId 映射未验证 |
| **整体加权** | **≈75%** | |

---

## 二、知道的问题（需要修的）

### 🔴 P0 — 阻塞功能

| # | 问题 | 影响 |
|---|------|------|
| 1 | **管理端上传试卷只送 JSON，没有真正上传文件** | `adminCreatePaper` 调 `POST /admin/exercise/papers` 带 JSON body，但这端点期望 multipart/form-data。首页测试会失败。 |
| 2 | **exercise 定价复用下载单价，语义错误** | `getDownloadPrice()` 返回"按题计费"的价格（如 ¥2/题）。练习卷应该有自己的 `exercise.unitPrice`。 |
| 3 | **订单 paperId 字段存的是 exercise_paper 的 UUID，但 getDownloadUrl 查的 exercise_paper 表** | paperId 列类型是 `UUID`，但 Order entity 的 `@ManyToOne` 指向的是 `Paper` 表（知识库切好的题）。exercise_paper 是另一张表，JOIN 会失败。需要加 `exercise_paper_id` 列或复用 `paper_id` 但去掉外键约束。 |

### 🟡 P1 — 功能可用但有缺陷

| # | 问题 | 影响 |
|---|------|------|
| 4 | **上传试卷后没有调 Python 生成缩略图** | 抽取结果页的 thumbnail 为空，用户体验差 |
| 5 | **支付页 receipt 不识别 `type=exercise`** | 点击「去支付」后支付页不知道如何处理 exercise 类型 |
| 6 | **用户端 draw 页若后端返回错误，仅显示"暂无试卷"** | 网络超时、服务器 500 等所有异常都被吞为同一条消息 |
| 7 | **没有测试** | 3 个新 Entity、2 个新 Controller、1 个新 Service 零覆盖 |

### 🟢 P2 — 体验优化

| # | 问题 |
|---|------|
| 8 | 管理端练习管理页面布局拥挤，4 个折叠面板全部展开很长 |
| 9 | 同步练课时列表没有排序（sort_order 未用） |
| 10 | AdminSidebar 没有加入"练习管理"菜单项 |
| 11 | 首页 8 张卡片在移动端只有 2 列 |

---

## 三、修复计划

| # | 问题 | 修复方式 | 工时 |
|---|------|---------|------|
| 1 | 上传文件 | admin 端用 FormData + api.post multipart；后端 endpoint 加 `@UseInterceptors(FileInterceptor('file'))` | 15min |
| 2 | exercise 定价 | pricing_config 表加一条 `type='exercise'` 记录；pricingService 加 `getExercisePrice()` | 15min |
| 3 | paperId 映射 | order 实体新增 `exercise_paper_id` 可选字段，下载时查 exercise_paper 表 | 30min |
| 4 | 缩略图生成 | 上传试卷后异步调 Python `/generate-thumbnail`，回写 thumbnail_url | 30min |
| 5 | 支付页适配 | payment/index.vue 识别 type=exercise，金额用 exercise price | 15min |
| 6 | 错误处理 | draw.vue 区分后端错误 vs 无试卷 | 5min |
| 7 | 测试 | sms/alipay 级别的 20 tests | 1h |
| 8-11 | UI 优化 | 侧边栏 + 排序 + 响应式 | 1h |

**修复总工时：约 4 小时**

---

## 四、未涉及的部分

| 项目 | 说明 |
|------|------|
| 订单列表显示 exercise 类型 | 需在 orders/index.vue 新增「练习」Tab 或标签 |
| 支付回调 | 同 download 类型，无需改动 |
| 权限 | exercise 类目的创建/编辑/删除已加 `@Roles('admin')` |
| COS 集成 | Dev 模式本地存储，生产需接 COS |

---

## 五、代码统计

| 指标 | 数值 |
|------|------|
| 新增数据库表 | 4 |
| 新增 Entity | 3 |
| 新增 NestJS Service | 1（含 3 个子功能） |
| 新增 NestJS Controller | 2（用户+管理） |
| 新增前端页面 | 5（用户3 + 管理1 + 首页改动） |
| 新增 API 模块 | 1（exercise.ts） |
| 后端代码行数 | ~250 行 |
| 前端代码行数 | ~500 行 |

---

> **结论**：骨架 100% 完成，3 个 P0 bug 阻塞了真实使用。修完后可以端到端跑通：管理员上传 → 用户抽取 → 缩略图展示 → 支付下载。修复约需 4 小时。
