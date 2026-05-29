# AI Architecture — AI智能组卷小程序

Version 1.0 | 2026-05-29

---

# 1. AI Service Overview

```
┌─────────────────────────────────────────────────────────┐
│                    AI Service Layer                       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ 组卷引擎  │  │ 解析引擎  │  │ OCR引擎   │  │知识点引擎│ │
│  │(RAG+LLM) │  │ (LLM)    │  │(PaddleOCR)│  │(Embedding)│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │             │             │             │       │
│  ┌────┴─────────────┴─────────────┴─────────────┴────┐  │
│  │              LLM Router + Fallback                 │  │
│  │         Qwen3 (primary) → DeepSeek-V4 (fallback)  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 1.1 LLM Model Strategy

| Role | Model | Purpose |
|------|-------|---------|
| Primary | Qwen3 | 组卷生成、题目解析、知识点/难度识别 |
| Fallback | DeepSeek-V4 | Qwen3不可用时自动切换 |
| Embedding | Qwen3 Embedding / text2vec | 题目与知识点向量化 |

### Fallback Logic

```
Call Qwen3
  │
  ├── Success → Return result
  │
  └── Timeout (30s) / 5xx / Rate Limit
        │
        └── Call DeepSeek-V4
              │
              ├── Success → Return result + flag `fallback: true`
              │
              └── Failure → Return error 20003
```

---

# 2. Paper Generation Engine (组卷引擎)

## 2.1 RAG Pipeline

```
教师输入条件
    │
    ▼
┌─────────────────┐
│ Step 1: Filter   │  数据库过滤（subject, grade, difficulty, is_deleted=false）
│ (Database)       │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Step 2: Retrieve │  pgvector语义检索
│ (Vector Search)  │  - 题目内容Embedding vs 用户选择的知识点Embedding
│                  │  - 相似度排序，Top-K 召回 (K = 题量 × 3)
└────────┬────────┘
         ▼
┌─────────────────┐
│ Step 3: Rank     │  难度分布均匀化
│ (Re-rank)        │  - 混合模式: 按 1:2:1 比例分配简单:中等:困难
│                  │  - 指定难度: 同难度内随机抽样
└────────┬────────┘
         ▼
┌─────────────────┐
│ Step 4: Generate │  LLM 生成试卷
│ (LLM)            │  - 构建 Prompt (检索到的候选题目 + 格式要求)
│                  │  - 组合现有题目 / 必要时生成新题
│                  │  - 输出结构化JSON
└────────┬────────┘
         ▼
┌─────────────────┐
│ Step 5: Validate │  校验输出
│                  │  - JSON解析
│                  │  - 题目数量校验
│                  │  - 题型分布校验
│                  │  - 失败 → 重试(最多2次)
└────────┬────────┘
         ▼
    返回试卷
```

## 2.2 Prompt Template (组卷)

```
你是一位资深的教育考试命题专家。请根据以下条件生成一份试卷。

## 试卷要求
- 学科: {subject}
- 年级: {grade}
- 难度: {difficulty}
- 题目数量: {questionCount}题

## 参考题库（优先使用，若不足以生成新题补充）
{retrieved_questions_json}

## 输出要求
以严格的JSON格式输出，结构如下:
{
  "title": "试卷标题",
  "questions": [
    {
      "index": 1,
      "type": "single_choice|multi_choice|true_false|fill_blank|short_answer",
      "content": "题目正文",
      "options": ["A. ...", "B. ..."]  // 选择题必填，填空题和解答题为空数组
    }
  ]
}

## 规则
1. 题型多样化：避免同类型题目集中排列
2. 难度均匀分布：简单:中等:困难≈{ratio}
3. 优先使用参考题库中的题目，不足时生成新题补充
4. 新题难度和内容必须符合{grade}{subject}的教学大纲
```

## 2.3 Prompt Template (题目解析)

```
你是一位教育考试题目解析专家。请分析以下文本中的题目，并提取结构化信息。

## 文本内容
{raw_text}

## 输出要求
以JSON数组输出所有识别到的题目:
[
  {
    "type": "single_choice|multi_choice|true_false|fill_blank|short_answer",
    "content": "题目正文",
    "options": ["A. ...", "B. ..."],
    "answer": "正确答案",
    "analysis": "解题思路或解析"
  }
]

## 规则
1. 准确识别题目边界，不要合并多题，也不要拆散单题
2. 选择题需提取所有选项并标注正确答案
3. 若题目中未提供答案或解析，answer/analysis字段置空字符串
4. 忽略非题目的教学说明、页眉页脚等无关内容
```

## 2.4 Prompt Template (知识点识别)

```
你是一位K12教育领域的学科专家。题目所属的学科是"{subject}"，年级是"{grade}"。
请识别以下题目涉及的知识点。

## 题目
{question_content}

## 输出要求
以JSON数组返回知识点名称:
["知识点1", "知识点2"]

## 规则
1. 知识点粒度适中: 不要太宽泛(如"数学")，也不要太细碎(如"异分母分数加减法中分母为质数的情况")
2. 每个题目1-3个知识点
3. 使用教学中通用的知识点命名
4. 严格限定在{subject}学科{grade}年级的知识范围内
```

## 2.5 Prompt Template (难度识别)

```
你是一位K12教育考试评价专家。请评定以下题目的难度等级。

## 题目
{question_json}

## 难度标准
- Level 1 (简单): 单一知识点，直接套用公式或概念即可解答
- Level 2 (中等): 需要2-3步推理，或综合运用多个知识点
- Level 3 (困难): 需要综合分析、创新思维或较复杂的多步推导

## 输出要求
仅输出数字: 1、2、或 3
```

---

# 3. OCR Pipeline

## 3.1 Processing Flow

```
文件上传 (PNG/JPG/JPEG/扫描PDF)
    │
    ▼
┌──────────────────┐
│ Pre-processing    │
│ - 图片去噪        │
│ - 倾斜校正        │
│ - 分辨率调整      │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ PaddleOCR Engine  │
│ - 文字检测 (DB)   │
│ - 文字识别 (CRNN) │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Post-processing   │
│ - 文本合并(按行)  │
│ - 段落重组        │
│ - 公式区域标记    │
└────────┬─────────┘
         ▼
    OCR结果文本
```

## 3.2 PDF Handling

```
PDF File
  │
  ├── 文字版PDF → pdf-text-extract → 直接提取文字层
  │
  └── 扫描版PDF → pdf-to-image → PNG序列 → PaddleOCR Pipeline
```

文件类型判断: 先尝试提取文字层，若提取内容为空或不足总页数的30%，判定为扫描版。

---

# 4. Difficulty Assessment Engine

## 4.1 Auto-Rating Strategy

```
题目内容
    │
    ├── LLM评估 (主路径) → Prompt模板(难度识别) → 1/2/3
    │
    └── 规则辅助 (fallback，LLM不可用时)
          │
          ├── 关键词匹配:
          │   - Level 1关键词: "直接计算","化简","填空","选择"
          │   - Level 2关键词: "证明","求解","推理","综合"
          │   - Level 3关键词: "探究","讨论","开放","压轴"
          │
          └── 文本复杂度:
              - 字数 < 50: 偏向 Level 1
              - 字数 50-150: 偏向 Level 2
              - 字数 > 150: 偏向 Level 3
```

---

# 5. Error Handling & Resilience

## 5.1 Retry Policy

| Stage | Max Retries | Backoff | Fallback Action |
|-------|-------------|---------|-----------------|
| LLM Call | 2 | 1s, 3s | Switch to fallback model |
| Vector Search | 1 | 500ms | Skip vector, use DB filter only |
| OCR | 1 | 2s | Mark task failed, notify admin |
| Embedding | 1 | 500ms | Skip embedding, use keyword match |

## 5.2 Circuit Breaker

若某个LLM在 60秒内失败 ≥ 5次 → 熔断 120秒 → 期间所有请求使用备用模型 → 熔断结束后试探1次 → 成功则恢复。

## 5.3 Timeout Budget

| Operation | Timeout |
|-----------|---------|
| 组卷总耗时 | 30s |
| 单次LLM调用 | 20s |
| Vector Search | 3s |
| OCR单文件 | 60s |
| 导出(DOCX+PDF) | 15s |

---

# 6. Monitoring & Observability

## 6.1 Key Metrics

| Metric | Target |
|--------|--------|
| 组卷成功率 | ≥ 95% |
| LLM平均延迟 | ≤ 8s |
| OCR识别成功率 | ≥ 90% |
| Embedding检索命中率 | ≥ 80% |
| Fallback切换率 | ≤ 5% |

## 6.2 LLM Call Logging

每次LLM调用记录:

```json
{
  "id": "uuid",
  "model": "qwen3",
  "purpose": "paper_generation",
  "inputTokens": 2450,
  "outputTokens": 1800,
  "latencyMs": 7200,
  "success": true,
  "createdAt": "2026-05-29T10:00:00Z"
}
```
