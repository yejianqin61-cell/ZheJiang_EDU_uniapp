# Knowledge Base Design — AI智能组卷小程序

Version 1.0 | 2026-05-29

---

# 1. Knowledge Base Overview

知识库是本系统的核心资产，由两部分构成:

```
┌──────────────────────────────────────────────┐
│                Knowledge Base                 │
│                                               │
│  ┌─────────────────┐  ┌───────────────────┐  │
│  │   题库 (Questions)│  │ 知识点中心 (KP)    │  │
│  │                  │  │                   │  │
│  │ - 题目内容       │  │ - 知识点名称       │  │
│  │ - 答案/解析      │  │ - 学科/年级        │  │
│  │ - 难度等级       │  │ - 关联题目数       │  │
│  │ - 题目Embedding  │  │ - 知识点Embedding  │  │
│  └────────┬────────┘  └─────────┬─────────┘  │
│           │                     │             │
│           └───── N:N ───────────┘             │
│           (question_knowledge)                 │
└──────────────────────────────────────────────┘
```

## 1.1 Design Principles

1. **AI-Driven**: 知识点完全由AI自动创建、归类、归并，无人工操作入口
2. **Admin-Guided Scope**: 管理员上传资料时指定学科和年级，AI在此范围内识别知识点
3. **Semantic Dedup**: 通过Embedding相似度自动归并语义相近的知识点
4. **Vector-First Retrieval**: 组卷检索以向量相似度为主要排序依据

---

# 2. Knowledge Point Lifecycle

## 2.1 State Machine

```
                    ┌──────────┐
                    │ 不存在    │
                    └────┬─────┘
                         │ AI识别到新知识点
                         ▼
                    ┌──────────┐
                    │  ACTIVE   │◄──────── 关联到新题目(qst_count++)
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         关联题目      被归并      关联题目
         数量>0      (相似度≥.92)   数量=0
              │          │          │
              ▼          ▼          ▼
         保持ACTIVE  MERGED     ┌──────────┐
                    (保留主KP)   │ ORPHANED  │── 可被定时任务清理
                                └──────────┘
```

## 2.2 Creation Flow

```
题目解析完成
    │
    ▼
┌─────────────────────────────┐
│ AI提取候选知识点名称           │
│ Prompt: "识别知识点" +        │
│ subject/grade 约束           │
└────────────┬────────────────┘
             ▼
┌─────────────────────────────┐
│ 候选知识点名 → Embedding      │
└────────────┬────────────────┘
             ▼
┌─────────────────────────────┐
│ pgvector 相似度检索           │
│ (限定 subject + grade 范围)   │
│ Top-5, cosine_similarity     │
└────────────┬────────────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
max_sim ≥ 0.92    max_sim < 0.92
    │                 │
    ▼                 ▼
归并到已有KP      创建新KP
(不新增，增加      INSERT INTO
 qst_count)       knowledge_point
```

---

# 3. Vector Search Design

## 3.1 Embedding Strategy

| Entity | Embedding Source | Dimension | Index |
|--------|-----------------|-----------|-------|
| question.content | Qwen3 Embedding API | 1536 | IVFFlat (cosine) |
| knowledge_point.name | Qwen3 Embedding API | 1536 | IVFFlat (cosine) |

## 3.2 Index Configuration

```sql
-- 题目向量索引 (高召回场景)
CREATE INDEX idx_q_embedding ON question
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);  -- lists ≈ rows/1000

-- 知识点向量索引 (小数据量，精确检索)
CREATE INDEX idx_kp_embedding ON knowledge_point
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 10);
```

## 3.3 Search Parameters

| Scenario | K (召回数) | probes | min_similarity |
|----------|-----------|--------|---------------|
| 组卷选题 | questionCount × 3 | 10 | 0.60 |
| 知识点匹配 | 5 | 5 | 0.75 |
| 知识点归并 | 5 | 5 | 0.92 |

### Search Query Example

```sql
-- 组卷检索: 根据用户选择的知识点向量检索相关题目
SELECT q.id, q.content, q.difficulty,
       1 - (q.embedding <=> $1::vector) AS similarity
FROM question q
WHERE q.is_deleted = FALSE
  AND q.status = 'approved'
  AND q.subject = $2
  AND q.grade = $3
ORDER BY q.embedding <=> $1::vector
LIMIT $4;
```

`<=>` is the cosine distance operator in pgvector.

---

# 4. Knowledge Point Merging Algorithm

## 4.1 Merge Decision

```
输入: 候选知识点名称 name_candidate
      Embedding: emb_candidate
      约束: subject, grade

1. 在 knowledge_point 表中查询同 subject + grade 的所有KP
2. 计算 emb_candidate 与每个KP的 cosine_similarity
3. 取 max_similarity

IF max_similarity ≥ 0.92:
    → MERGE: 关联到最佳匹配KP (kp_id = best_match.id)
    → 更新 best_match.question_count += 1
    → 不创建新KP

ELSE:
    → CREATE: 创建新KP
    → INSERT INTO knowledge_point (name, subject, grade, embedding)
    → question_count = 1
```

## 4.2 Cosine Similarity in pgvector

```sql
-- 查找最相似的知识点（用于归并判断）
SELECT id, name,
       1 - (embedding <=> $1::vector) AS similarity
FROM knowledge_point
WHERE subject = $2 AND grade = $3
  AND 1 - (embedding <=> $1::vector) >= 0.92
ORDER BY embedding <=> $1::vector
LIMIT 1;
```

## 4.3 Threshold Tuning

| Threshold | Effect | Risk |
|-----------|--------|------|
| 0.88 (宽松) | 更多归并，知识点数量少 | 可能误合并不同知识点 |
| 0.92 (推荐) | 平衡 | - |
| 0.95 (严格) | 更少归并，知识点数量多 | 可能出现"一次函数"/"线性函数"重复 |

推荐初始值 0.92，运行一个月后根据实际归并准确率调整。

---

# 5. Knowledge Point Taxonomy

## 5.1 Classification Dimensions

每个知识点属于唯一的三维分类:

```
(学科, 年级, 知识点名称)
  │      │        │
  ▼      ▼        ▼
 数学   五年级   分数加减法
```

分类来源:
- **学科**: 管理员上传文件时指定（固定，AI不修改）
- **年级**: 管理员上传文件时指定（固定，AI不修改）
- **知识点名称**: AI自动识别和创建

## 5.2 Naming Convention

知识点命名遵循以下规则（通过Prompt约束AI）:

- 使用教学通用术语: "一元一次方程" ✅ 而非 "含一个未知数的一次方程" ❌
- 避免过细粒度: "分数加减法" ✅ 而非 "同分母分数加法" ❌
- 避免过宽粒度: "几何" ❌ 应细化为 "三角形面积"/"平行四边形性质" ✅
- 基于课程标准的章节知识点命名

---

# 6. Question-Knowledge Association

## 6.1 Association Model

```
question ──N:N── knowledge_point
            │
            ▼
    question_knowledge
    ├── question_id (FK)
    ├── knowledge_point_id (FK)
    └── confidence (REAL)  ← AI匹配的置信度
```

一个题目可关联 1-3 个知识点。

## 6.2 Batch Association During Parsing

当一批题目完成AI解析后:

```
FOR each parsed_question:
    1. LLM识别知识点名称列表 ["KP1", "KP2"]
    2. FOR each KP name:
       a. 生成 Embedding
       b. 在 knowledge_point 中搜索 (同subject+grade)
       c. 相似度 ≥ 0.92 → MERGE 到已有KP
       d. 相似度 < 0.92 → CREATE 新KP
       e. INSERT INTO question_knowledge (question_id, kp_id, confidence)
```

---

# 7. Vector Re-indexing Strategy

## 7.1 When to Re-index

IVFFlat索引在数据量变化较大时需重建:

| Trigger | Action |
|---------|--------|
| 新增题目 > 总题量的20% | REINDEX idx_q_embedding |
| 新增知识点 > 总KP的50% | REINDEX idx_kp_embedding |
| 每周日凌晨 | 自动REINDEX (Cron Job) |

## 7.2 Re-index Command

```sql
REINDEX INDEX CONCURRENTLY idx_q_embedding;
REINDEX INDEX CONCURRENTLY idx_kp_embedding;
```

`CONCURRENTLY` 避免锁表，允许在线重建。

---

# 8. Data Integrity Rules

| Rule | Enforcement |
|------|-------------|
| 知识点唯一性 | (name, subject, grade) 联合唯一索引 |
| 题目-知识点关联唯一性 | (question_id, knowledge_point_id) 联合唯一 |
| 知识点不可手动C/U/D | API层无对应端点，仅AI模块服务层可写 |
| 被归并的知识点清理 | 定时任务: question_count=0 且未关联任何题目的KP自动删除 |
| 软删除题目不参与检索 | 所有检索查询WHERE条件包含 is_deleted = FALSE |

---

# 9. Performance Optimization

## 9.1 Caching Strategy

| Cache | TTL | Key |
|-------|-----|-----|
| 知识点列表(按学科+年级) | 10 min | `kp:list:{subject}:{grade}` |
| 题库统计 | 5 min | `question:stats` |
| Embedding结果(题目) | 永久(仅在题目内容变更时失效) | 存储在question.embedding列 |

## 9.2 Batch Operations

- 批量Embedding: 每批50题，减少API调用次数
- 批量知识点匹配: 使用pgvector的批量距离计算 `<->` operator
- 批量写入question_knowledge: 使用INSERT ... ON CONFLICT DO NOTHING

## 9.3 Cold Start

系统初始化时知识点库为空:

1. 管理员上传首批资料（需指定学科、年级）
2. AI解析题目 + 识别知识点（全部走CREATE路径）
3. 随着题目累积，知识点归并机制自动生效
4. 预计首批1000题入库后，知识点体系基本稳定
