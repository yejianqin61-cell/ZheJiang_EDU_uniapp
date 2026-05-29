# Admin Module — 运营管理模块

Version 1.0 | 2026-05-29

---

## 模块职责

负责管理后台的日常运营功能：题库总览仪表盘、题库管理CRUD、上传文件管理。与KnowledgeBase模块形成"建"与"管"的分工——KnowledgeBase负责知识入库管线，Admin负责入库后的运营管理。

---

## 功能列表

### 仪表盘

| ID | 功能 | 描述 |
|----|------|------|
| AD-01 | 题库总览统计 | 总题量、学科/年级/难度分布、知识点总数，支持图表可视化 |
| AD-02 | 学科分布 | 各学科题目数量统计（饼图/柱状图） |
| AD-03 | 年级分布 | 各年级题目数量统计 |
| AD-04 | 难度分布 | 简单/中等/困难三级题目占比 |

### 题库管理

| ID | 功能 | 描述 |
|----|------|------|
| AD-05 | 题目列表 | 分页展示已入库题目，含题目摘要/学科/年级/知识点/难度/来源文件 |
| AD-06 | 题目详情 | 查看单题完整信息（题目、选项、答案、解析、知识点、难度、来源文件） |
| AD-07 | 多维度筛选 | 按学科、年级、知识点、难度、来源文件组合筛选（AND逻辑） |
| AD-08 | 关键词搜索 | 全文搜索题目内容和知识点名称 |
| AD-09 | 单题删除 | 软删除（is_deleted=true），不再参与组卷检索 |
| AD-10 | 批量删除 | 勾选多题批量软删除 |
| AD-11 | 按文件删除 | 按来源文件批量软删除所有关联题目 |

### 文件管理

| ID | 功能 | 描述 |
|----|------|------|
| AD-12 | 文件列表 | 展示已上传文件列表（文件名、类型、上传时间、处理状态、关联题目数） |
| AD-13 | 文件删除 | 删除文件记录，同时软删除关联的所有题目 |

---

## 前端页面

| 页面 | 路由 | 描述 |
|------|------|------|
| 仪表盘 | `/pages/admin/dashboard/index` | 题库总览统计图表 |
| 题库管理 | `/pages/admin/questions/index` | 题目列表 + 筛选 + 搜索 + 批量操作 |
| 题目详情 | `/pages/admin/questions/detail` | 完整题目信息展示 |
| 文件管理 | `/pages/admin/files/index` | 已上传文件列表 + 删除操作 |

---

## 后端服务

| 服务 | 职责 |
|------|------|
| `DashboardService` | 统计聚合查询（总题量、学科/年级/难度分布） |
| `QuestionManageService` | 题目CRUD、筛选、搜索、软删除 |
| `FileManageService` | 文件列表查询、文件删除（含关联题目软删除） |

---

## 数据表

| 表 | 用途 |
|---|------|
| `question` | 题库主表（查询、筛选、搜索、软删除） |
| `knowledge_point` | 知识点表（统计引用） |
| `kb_file` | 上传文件表（列表查询、删除） |
| `paper_question_snapshot` | 检查题目是否被试卷引用 |

---

## API

### 仪表盘

| Method | Endpoint | Auth | 描述 |
|--------|----------|------|------|
| GET | `/v1/admin/questions/stats` | admin | 题库总览统计 |

```
Response:
{
  "totalQuestions": 15230,
  "bySubject": [{"subject":"数学", "count":4520}, ...],
  "byGrade": [{"grade":"五年级", "count":2100}, ...],
  "byDifficulty": [
    {"level":1, "label":"简单", "count":5200},
    {"level":2, "label":"中等", "count":6800},
    {"level":3, "label":"困难", "count":3230}
  ],
  "totalKnowledgePoints": 860
}
```

### 题库管理

| Method | Endpoint | Auth | 描述 |
|--------|----------|------|------|
| GET | `/v1/admin/questions?page=&pageSize=&subject=&grade=&difficulty=&knowledgePointId=&fileId=&keyword=` | admin | 题目列表（多维度筛选） |
| GET | `/v1/admin/questions/{questionId}` | admin | 题目详情（含答案/解析/知识点/来源文件） |
| DELETE | `/v1/admin/questions/{questionId}` | admin | 单题软删除 |
| POST | `/v1/admin/questions/batch-delete` | admin | 批量软删除 { questionIds: [...] } |
| POST | `/v1/admin/questions/delete-by-file` | admin | 按文件软删除 { fileId: "uuid" } |

### 文件管理

| Method | Endpoint | Auth | 描述 |
|--------|----------|------|------|
| GET | `/v1/admin/files?page=&pageSize=&status=` | admin | 已上传文件列表 |
| DELETE | `/v1/admin/files/{fileId}` | admin | 删除文件及关联题目（软删除） |

---

## 状态流转

### 题目生命周期（运营视角）

```
APPROVED（已审核通过，正式题库）
    │
    ├── 参与组卷检索 ← 正常状态
    │
    ├── 管理员单题删除 → is_deleted = TRUE
    │
    ├── 管理员批量删除 → is_deleted = TRUE
    │
    └── 管理员按文件删除 → is_deleted = TRUE
         │
         ▼
    ┌──────────────┐
    │ is_deleted=T  │  ← 不参与组卷，不展示在列表中
    └──────────────┘
```

### 文件管理状态

```
kb_file.status = COMPLETED（处理完成，题目已入库）
    │
    └── 管理员删除文件
         │
         ▼
    ┌──────────────────┐
    │ 文件记录删除       │
    │ 关联题目软删除     │  ← question.is_deleted = TRUE WHERE source_file_id = fileId
    └──────────────────┘
```
