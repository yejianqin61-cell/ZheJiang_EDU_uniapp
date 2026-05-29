# KnowledgeBase Module — 知识库模块

Version 1.0 | 2026-05-29

---

## 模块职责

负责知识库的完整入库管线：从管理员上传原始资料到题目审核入库，以及知识点中心的只读展示。知识点完全由AI自动维护，无人工C/U/D操作。

---

## 功能列表

### 资料入库管线

| ID | 功能 | 描述 |
|----|------|------|
| KB-01 | 文件上传 | 管理员上传DOC/DOCX/MD/PDF/PNG/JPG/JPEG，同时指定年级和学科 |
| KB-02 | 文件类型判定 | 自动识别文本类/图片类/扫描PDF，路由至对应处理流程 |
| KB-03 | OCR文字识别 | PaddleOCR引擎识别图片和扫描PDF中的文字，≤60秒/文件 |
| KB-04 | AI题目切分 | LLM对OCR/文本提取结果进行题目边界切分，拆分为单题 |
| KB-05 | AI答案解析 | LLM识别题目类型、答案、解析，输出结构化数据 |
| KB-06 | AI知识点识别 | 在管理员指定的学科/年级范围内，Embedding检索+LLM识别知识点 |
| KB-07 | AI难度识别 | LLM自动判定难度等级：简单(1) / 中等(2) / 困难(3) |
| KB-08 | 知识点自动归并 | Embedding相似度≥0.92的知识点自动归并，防止语义重复 |
| KB-09 | 处理进度展示 | 实时展示上传→OCR→解析→待审核的进度与当前阶段 |

### 入库审核

| ID | 功能 | 描述 |
|----|------|------|
| KB-10 | 待审核列表 | 展示AI解析完成后的题目，含题目/答案/解析/知识点/难度/来源文件 |
| KB-11 | 单题通过 | 逐题审核通过，status→APPROVED，进入正式题库 |
| KB-12 | 单题拒绝 | 逐题拒绝，status→REJECTED |
| KB-13 | 批量通过 | 勾选多题一次性通过 |
| KB-14 | 批量拒绝 | 勾选多题一次性拒绝 |
| KB-15 | 全选/反选 | 快速勾选当前页全部题目 |

### 知识点中心

| ID | 功能 | 描述 |
|----|------|------|
| KB-16 | 知识点列表 | 只读分页列表：知识点名称、学科、年级、关联题目数量 |
| KB-17 | 知识点搜索 | 按名称搜索知识点 |
| KB-18 | 知识点筛选 | 按学科、年级筛选知识点 |

---

## 前端页面

| 页面 | 路由 | 描述 |
|------|------|------|
| 上传页 | `/pages/admin/upload/index` | 选择文件 + 指定学科/年级 → 提交上传 |
| 上传进度页 | `/pages/admin/upload/progress` | 实时展示处理阶段与进度百分比 |
| 审核列表页 | `/pages/admin/review/index` | 待审核题目列表，支持逐题查看/批量操作 |
| 审核详情 | `/pages/admin/review/detail` | 单题完整信息（题目/答案/解析/知识点/难度/来源） |
| 知识点中心 | `/pages/admin/knowledge/index` | 知识点只读列表，支持搜索与筛选 |

---

## 后端服务

| 服务 | 职责 |
|------|------|
| `UploadService` | 接收文件、校验格式/大小、上传至COS、创建kb_file记录 |
| `OCRService` | 调度PaddleOCR引擎、文字提取、结果回写ocr_task表 |
| `SplitterService` | 调用LLM进行题目边界切分、输出题目片段列表 |
| `TaggerService` | 调用LLM识别题型/答案/解析、调用LLM识别知识点、调用LLM识别难度 |
| `EmbeddingService` | 调用Embedding模型生成题目向量和知识点向量、写入pgvector |
| `KnowledgeService` | 知识点检索匹配、自动创建/归并、知识点中心查询 |
| `ReviewService` | 待审核列表查询、单题/批量审核、状态流转 |

---

## 数据表

| 表 | 用途 |
|---|------|
| `kb_file` | 上传的原始文件记录（含管理员指定的学科、年级） |
| `ocr_task` | OCR任务状态与结果 |
| `question` | 题库主表（含题目内容、答案、解析、难度、Embedding、审核状态） |
| `knowledge_point` | 知识点表（AI自动维护，含Embedding） |
| `question_knowledge` | 题目↔知识点 N:N 关联（含AI置信度） |

---

## API

### 文件上传

| Method | Endpoint | Auth | 描述 |
|--------|----------|------|------|
| POST | `/v1/admin/files/upload` | admin | 上传文件（multipart: file + subject + grade） |
| GET | `/v1/admin/files/{fileId}` | admin | 查询文件处理状态与进度 |

### 入库审核

| Method | Endpoint | Auth | 描述 |
|--------|----------|------|------|
| GET | `/v1/admin/reviews?page=&pageSize=&fileId=` | admin | 待审核题目列表 |
| POST | `/v1/admin/reviews/batch` | admin | 批量审核 { questionIds, action: "approve"\|"reject" } |

### 知识点中心

| Method | Endpoint | Auth | 描述 |
|--------|----------|------|------|
| GET | `/v1/admin/knowledge-points?page=&pageSize=&subject=&grade=&keyword=` | admin | 知识点只读列表 |

> 知识点无 POST/PUT/DELETE 端点 — 完全由AI自动维护。

---

## 状态流转

### 文件处理状态

```
UPLOADING
    │ (文件上传至COS成功)
    ▼
PROCESSING
    │
    ├── 文本类: AI切题 → AI解析 → 知识点/难度识别
    │
    └── 图片类: OCR → AI切题 → AI解析 → 知识点/难度识别
    │
    ▼
COMPLETED  /  FAILED
 (全部题目进入待审核)  (记录error_msg)
```

### 题目审核状态

```
PARSED（AI解析完成，待审核）
    │
    ├── 管理员通过 → APPROVED（进入正式题库，可参与组卷检索）
    │
    └── 管理员拒绝 → REJECTED（30天后自动清除）
```

### 知识点生命周期

```
题目解析完成
    │
    ▼
AI提取候选知识点名称 → Embedding
    │
    ▼
pgvector相似度检索 (同subject+grade范围内)
    │
    ├── max_sim ≥ 0.92 → MERGE（关联到已有知识点，question_count++）
    │
    └── max_sim < 0.92 → CREATE（新建知识点，自动归类）
```
