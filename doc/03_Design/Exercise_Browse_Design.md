# 练习模块「随机抽题 → 列表浏览」— 设计文档

**版本**: 1.0 | **日期**: 2026-06-19 | **状态**: 待确认（见 [Clarify](../../02_Requirements/Exercise_Browse_Clarify.md)）

---

## 一、改动概述

| 维度 | 旧 | 新 |
|------|----|----|
| 获取试卷 | 随机抽1个 | 列出全部，用户自选 |
| 入口按钮 | 「AI智能抽取题目」 | 「查看试卷」 |
| draw 页 | 抽题动画 + 1个结果 | 试卷列表 + 点击进入详情 |
| 收费 | 抽到即付费 | 浏览免费，下载/打印才付费 |
| draw_record 表 | 用 | 删除 |

---

## 二、后端改动

### 2.1 新增/替换 API

| 方法 | 路径 | 说明 |
|------|------|------|
| **GET** | `/exercise/papers?categoryId=X` | 列出某类目下所有试卷（公开） |
| **GET** | `/exercise/papers?lessonId=X` | 列出某课时下所有试卷（公开） |
| GET | `/exercise/papers/:id` | 获取单卷详情（已有，保留） |

旧的 draw 端点删除：
- ~~`POST /exercise/categories/:id/draw`~~ → 替换为 `GET /exercise/papers?categoryId=:id`
- ~~`POST /exercise/lessons/:id/draw`~~ → 替换为 `GET /exercise/papers?lessonId=:id`

### 2.2 ExerciseService 改动

- **删除** `draw()` 方法
- **新增** `listPublicPapers(categoryId?, lessonId?)` — 公开查询，不需要 admin 角色
- **删除** `ExerciseDrawRecord` 相关引用

### 2.3 数据库

- **删除表** `exercise_draw_record`
- **删除实体** `exercise-draw-record.entity.ts`
- **删除** `exercise.module.ts` 中的 `ExerciseDrawRecord` 导入

---

## 三、前端改动

### 3.1 category.vue — 按钮文案

```
旧：🤖 AI智能抽取题目
新：📋 查看试卷
```

点击后导航到 `/exercises/papers?categoryId=xxx` 或 `/exercises/papers?lessonId=xxx`

### 3.2 draw.vue → papers.vue — 改造为试卷列表页

**旧**：接收 `nodeType` + `nodeId`，调用 draw API，显示一个结果

**新**：接收 `categoryId` 或 `lessonId`，调用 list API，显示试卷列表

```
┌──────────────────────────────────────────┐
│  首页 › 练习 › 五年级数学                  │
│                                          │
│  📄 第一章 小数乘法 — 共 3 份试卷           │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │ ┌──────┐  小数乘法单元测试卷          │ │
│  │ │ 缩略  │  DOCX · 45KB · 2页        │ │
│  │ │  图   │                  [查看]   │ │
│  │ └──────┘                           │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │ ┌──────┐  小数乘法提高卷              │ │
│  │ │ 缩略  │  PDF · 120KB · 4页        │ │
│  │ │  图   │                  [查看]   │ │
│  │ └──────┘                           │ │
│  └─────────────────────────────────────┘ │
│  ...                                     │
└──────────────────────────────────────────┘
```

点击「查看」→ 进入详情页 `/exercises/papers/:id`（复用现有 `getPaper` 端点 + 新建 detail 页或复用 draw 页的详情部分）。

### 3.3 试卷详情页（新建或复用）

```
┌──────────────────────────────────────────┐
│  首页 › 练习 › 小数乘法单元测试卷            │
│                                          │
│  ┌────────┐  试卷标题                     │
│  │  缩略   │  DOCX · 45KB · 2页           │
│  │  大图   │                              │
│  └────────┘                              │
│                                          │
│  ┌──────────┐  ┌──────────┐              │
│  │ 📥 下载服务│  │ 🖨️ 打印服务│              │
│  │ ¥5.00/次  │  │ 在线下单  │              │
│  └──────────┘  └──────────┘              │
└──────────────────────────────────────────┘
```

### 3.4 路由

- `/exercises/draw` → **改为** `/exercises/papers`
- 新增 `/exercises/papers/:id` → 试卷详情

### 3.5 API 模块

- 删除 `drawCategory()`, `drawLesson()`
- 新增 `getPapersByCategory(categoryId)`, `getPapersByLesson(lessonId)`, `getPaperDetail(id)`

---

## 四、改动文件清单

| # | 文件 | 改动 |
|---|------|------|
| 1 | `backend/src/modules/exercise/exercise.controller.ts` | 删 draw 端点，新增公开 list papers |
| 2 | `backend/src/modules/exercise/exercise.service.ts` | 删 draw()，新增 listPublicPapers()，删 drawRecord 引用 |
| 3 | `backend/src/modules/exercise/exercise.module.ts` | 删 ExerciseDrawRecord |
| 4 | `backend/src/database/entities/exercise-draw-record.entity.ts` | 删除文件 |
| 5 | `frontend-web/src/pages/exercises/category.vue` | 按钮文案 + 跳转路径 |
| 6 | `frontend-web/src/pages/exercises/draw.vue` | 改造为试卷列表页 |
| 7 | `frontend-web/src/pages/exercises/paper-detail.vue` | 新建 — 试卷详情 |
| 8 | `frontend-web/src/api/modules/exercise.ts` | 删 draw 函数，新增 list/detail |
| 9 | `frontend-web/src/router/index.ts` | 改 + 新增路由 |
| **共 9 个文件** | | |

---

## 五、预估工时

| Phase | 内容 | 工时 |
|-------|------|------|
| Phase 1 | 后端：删 draw + 新 list API | 0.5h |
| Phase 2 | 前端：试卷列表页 + 详情页 | 1.5h |
| Phase 3 | 联调测试 | 0.5h |
| **合计** | | **2.5h** |
