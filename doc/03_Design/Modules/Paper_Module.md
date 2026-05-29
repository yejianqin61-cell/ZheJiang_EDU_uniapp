# Paper Module — 组卷模块

Version 1.0 | 2026-05-29

---

## 模块职责

负责AI智能组卷的完整流程：教师配置组卷条件 → 知识库检索 → LLM生成试卷 → 首页预览。教师端仅返回题目与选项（不含答案/解析/分值/知识点）。

---

## 功能列表

| ID | 功能 | 描述 |
|----|------|------|
| P-01 | 组卷条件配置 | 提供年级（级联选择）、科目（九科）、知识点（多选+搜索）、难度、题量的选择 |
| P-02 | 知识点联动 | 根据所选科目，过滤显示该科目下的知识点列表供教师勾选 |
| P-03 | 向量语义检索 | 根据教师选择的知识点Embedding，在pgvector中检索Top-N候选题目 |
| P-04 | LLM试卷生成 | 构建Prompt（候选题目+格式约束）→ 调用LLM → 30秒内返回结构化试卷 |
| P-05 | 试卷预览（首页） | 支付前免费预览首页题目（约前5题），仅展示题目与选项 |
| P-06 | 试卷重新生成 | 不满意可一键重新生成，复用原条件，每日限3次 |
| P-07 | 题目快照保存 | 生成后立即保存题目快照（paper_question_snapshot），防止原题被删后试卷内容丢失 |

---

## 前端页面

| 页面 | 路由 | 描述 |
|------|------|------|
| 组卷配置页 | `/pages/paper/config/index` | 年级→科目→知识点→难度→题量 逐步配置 |
| 试卷预览页 | `/pages/paper/preview/index` | 首页题目预览 + "支付后查看完整试卷"截断提示 |

---

## 后端服务

| 服务 | 职责 |
|------|------|
| `PaperService` | 组卷入口：接收条件、编排检索→生成→快照流程、试卷CRUD |
| `RetrievalService` | pgvector语义检索：知识点Embedding → 候选题目召回 → 难度重排序 |
| `GenerationService` | Prompt构建、LLM调用（Qwen3主/DeepSeek-V4备）、JSON解析与校验 |

---

## 数据表

| 表 | 用途 |
|---|------|
| `paper` | 试卷主表（user_id, title, conditions, question_ids, status, export_urls） |
| `paper_question_snapshot` | 试卷题目快照（paper_id, sort_order, question_id, snapshot JSONB） |
| `question` | 题库表（仅检索，不写入） |
| `knowledge_point` | 知识点表（仅查询列表） |

---

## API

| Method | Endpoint | Auth | 描述 |
|--------|----------|------|------|
| GET | `/v1/papers/config-options` | JWT | 获取组卷配置选项（年级/科目/难度枚举） |
| GET | `/v1/papers/knowledge-points?subject=&grade=` | JWT | 获取指定学科年级下的知识点列表 |
| POST | `/v1/papers/generate` | JWT | 提交组卷条件，生成试卷 |
| POST | `/v1/papers/{paperId}/regenerate` | JWT | 重新生成（每日限3次） |

### POST /v1/papers/generate

```
Request:
{
  "subject": "数学",
  "grade": "五年级",
  "knowledgePointIds": ["uuid1", "uuid2"],
  "difficulty": "mixed",
  "questionCount": 20
}

Response (教师端):
{
  "paperId": "uuid",
  "title": "五年级数学综合练习卷",
  "questions": [
    {
      "index": 1,
      "type": "single_choice",
      "content": "题目正文",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."]
    }
  ],
  "generateTime": 25.8
}
```

> 教师端不返回 answer / analysis / score / difficulty / knowledgePoint。元数据仅服务端存储，支付导出时随文件输出。

---

## 状态流转

```
┌────────┐
│  无试卷  │
└───┬────┘
    │ POST /papers/generate
    ▼
┌────────┐
│ DRAFT   │  ← 试卷已生成，可预览首页
└───┬────┘
    │
    ├── POST /papers/{id}/regenerate → 新DRAFT (原DRAFT标记过期)
    │
    └── POST /orders (支付) → 触发order创建
         │
         ▼
    ┌────────┐
    │  PAID   │  ← 支付成功，解锁完整查看与导出
    └───┬────┘
         │
         └── POST /papers/{id}/export/* → EXPORTED
              │
              ▼
         ┌──────────┐
         │ EXPORTED  │  ← 已导出，可从历史订单重复下载
         └──────────┘
```

### 组卷检索流程

```
教师提交条件
    │
    ▼
┌─────────────────┐
│ DB Filter        │  subject + grade + status=approved + is_deleted=false
└────────┬────────┘
         ▼
┌─────────────────┐
│ Vector Search    │  知识点Embedding → pgvector cosine检索 → Top-K候选
│ (pgvector)       │  K = questionCount × 3
└────────┬────────┘
         ▼
┌─────────────────┐
│ Re-rank          │  按难度分布重排序：混合模式 1:2:1 / 指定模式同难度随机抽样
└────────┬────────┘
         ▼
┌─────────────────┐
│ LLM Generate     │  Prompt(候选题目 + 格式约束) → Qwen3/DeepSeek-V4
│                  │  超时30s，失败重试2次
└────────┬────────┘
         ▼
┌─────────────────┐
│ Validate         │  JSON解析 → 题目数校验 → 题型分布校验
└────────┬────────┘
         ▼
┌─────────────────┐
│ Snapshot         │  写paper + paper_question_snapshot
└────────┬────────┘
         ▼
    返回试卷(仅题目+选项)
```
