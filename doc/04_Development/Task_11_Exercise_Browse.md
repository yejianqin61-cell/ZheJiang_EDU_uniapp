# Task 11 — 练习模块：随机抽题 → 列表浏览

**关联文档**：[Design](../03_Design/Exercise_Browse_Design.md) · [Clarify](../02_Requirements/Exercise_Browse_Clarify.md)  
**预估工时**：2.5 小时

---

## 需求确认

| # | 决策 | 结论 |
|---|------|------|
| Q1 | 试卷列表在哪展示 | **新页面跳转** `/exercises/papers` |
| Q2 | 收费节点 | **下载/打印才收费**，浏览免费 |
| Q3 | 列表显示缩略图 | **纯文本列表**，不显示缩略图 |
| Q4 | 同步练课时处理 | **单元+课时都展示**试卷 |
| Q5 | 无试卷时 | 显示空状态，**仅在已存在类目下**才引导上传 |
| Q6 | draw_record 表 | **保留**，不删除 |

---

## Phase 1：后端 API 改造 (0.5h)

### 1.1 exercise.controller.ts — 新增公开列表端点

**文件**：[exercise.controller.ts](backend/src/modules/exercise/exercise.controller.ts)

- [ ] 在 `ExercisePublicController` 新增 `GET /exercise/papers`
  - 参数：`categoryId?` / `lessonId?`，二选一
  - 返回该节点下所有试卷列表（id, title, fileType, fileSize, pageCount, createdAt）
  - **不需要** JWT 守卫（浏览免费）

- [ ] 旧的 draw 端点改为调用新的 list 逻辑：
  - `POST /exercise/categories/:id/draw` → 保留路径，内部改为 `GET /exercise/papers?categoryId=:id` 返回 [试卷数组]
  - `POST /exercise/lessons/:id/draw` → 同上

> 保留 draw 端点路径是为了前端兼容过渡，但返回内容从单卷 → 数组。

### 1.2 exercise.service.ts — 拆分 list + 废弃 draw

**文件**：[exercise.service.ts](backend/src/modules/exercise/exercise.service.ts)

- [ ] 新增 `listPublicPapers(categoryId?, lessonId?)` — 公开查询，不需要 admin
- [ ] `draw()` 方法标记 `@Deprecated`，内部改为调用 `listPublicPapers + 取第一个`（保留兼容）
- [ ] `draw_record` 表**不删**，代码保持不变

---

## Phase 2：前端试卷列表页 (1h)

### 2.1 路由改动

**文件**：[router.ts](frontend-web/src/router/index.ts)

- [ ] 新增 `/exercises/papers` → `exercises/papers/index.vue`（替换 draw.vue 的定位）
- [ ] 保留 `/exercises/draw` → 重定向到 `/exercises/papers`

### 2.2 新建试卷列表页

**文件**：`frontend-web/src/pages/exercises/papers/index.vue`（新建）

- [ ] 接收 query 参数：`categoryId`、`lessonId`、`nodeName`（类目名，用于面包屑）
- [ ] 调用 `GET /exercise/papers` 获取试卷列表
- [ ] 列表展示（**纯文本**，不显示缩略图）：

```
┌──────────────────────────────────────────┐
│  首页 › 练习 › 五年级数学 › 第一章 小数乘法   │
│                                          │
│  📄 小数乘法单元测试卷                      │
│     DOCX · 45KB · 2页           [查看]   │
│  ─────────────────────────────────────── │
│  📄 小数乘法提高卷                          │
│     PDF · 120KB · 4页           [查看]   │
│  ─────────────────────────────────────── │
│  📄 小数乘法期末模拟卷                      │
│     DOCX · 68KB · 3页           [查看]   │
└──────────────────────────────────────────┘
```

- [ ] 点击「查看」→ 跳转 `/exercises/papers/:id`
- [ ] 空状态：
  - 如果该节点是已存在的类目 → 显示「暂无试卷」+ 「上传试卷」按钮（跳贡献页）
  - 如果该节点无类目 → 仅显示「暂无试卷」
- [ ] 加载中 + 错误处理

### 2.3 试卷详情/操作页

**文件**：`frontend-web/src/pages/exercises/paper-detail/index.vue`（新建）

- [ ] 路由：`/exercises/papers/:id`
- [ ] 调用 `GET /exercise/papers/:id` 获取详情
- [ ] 展示：
  - 左侧：缩略图（如有）或文件图标占位
  - 右侧：标题、文件类型、大小、页数
  - 底部：下载服务 + 打印服务 两张分流卡
  - 点击下载 → `router.push('/payment?paperId=xxx&type=exercise')`
  - 点击打印 → `router.push('/print/checkout?paperId=xxx')`

### 2.4 category.vue — 按钮改文案

**文件**：[category.vue](frontend-web/src/pages/exercises/category.vue)

- [ ] 按钮文案：`🤖 AI智能抽取题目` → `📋 查看试卷`
- [ ] 导航目标：`/exercises/draw?nodeType=xxx&nodeId=xxx` → `/exercises/papers?categoryId=xxx&nodeName=xxx`
- [ ] 同步练课时：同样改为「查看试卷」→ `/exercises/papers?lessonId=xxx&nodeName=xxx`

### 2.5 清理 draw.vue

**文件**：[draw.vue](frontend-web/src/pages/exercises/draw.vue)

- [ ] 不再使用。可以保留文件但路由指向新页面。

### 2.6 API 模块更新

**文件**：[exercise.ts](frontend-web/src/api/modules/exercise.ts)

- [ ] 新增 `getPapersByCategory(categoryId)` → `GET /exercise/papers?categoryId=`
- [ ] 新增 `getPapersByLesson(lessonId)` → `GET /exercise/papers?lessonId=`
- [ ] 新增 `getPaperDetail(id)` → `GET /exercise/papers/:id`
- [ ] `drawCategory()` / `drawLesson()` 保留但标记废弃（兼容旧代码）

---

## 验收标准

- [ ] 点类目 → 进入试卷列表页，显示该节点下所有试卷（文本列表）
- [ ] 列表不显示缩略图，显示文件图标 + 标题 + 格式 + 大小
- [ ] 点「查看」→ 进入试卷详情，显示缩略图 + 下载/打印分流卡
- [ ] 下载/打印点击 → 正常跳支付/下单
- [ ] 空状态：有类目显示引导上传，无类目仅显示空状态
- [ ] 同步练课时同样展示试卷列表
- [ ] draw_record 表保留不删
- [ ] `npm run build` 0 错误

---

## 改动文件清单

| # | 文件 | 改动类型 |
|---|------|---------|
| 1 | `backend/src/modules/exercise/exercise.controller.ts` | 新增 GET /papers |
| 2 | `backend/src/modules/exercise/exercise.service.ts` | 新增 listPublicPapers() |
| 3 | `frontend-web/src/pages/exercises/papers/index.vue` | **新建** |
| 4 | `frontend-web/src/pages/exercises/paper-detail/index.vue` | **新建** |
| 5 | `frontend-web/src/pages/exercises/category.vue` | 按钮文案+路径 |
| 6 | `frontend-web/src/api/modules/exercise.ts` | 新增 list/detail 函数 |
| 7 | `frontend-web/src/router/index.ts` | 新增 2 条路由 |
| **共 7 个文件** | | |
