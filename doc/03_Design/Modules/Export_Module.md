# Export Module — 导出模块

Version 1.0 | 2026-05-29

---

## 模块职责

负责试卷的文档导出：根据试卷快照生成DOCX文件 → 可选转换为PDF → 上传至COS → 返回临时下载链接。支付完成后才可调用。

---

## 功能列表

| ID | 功能 | 描述 |
|----|------|------|
| E-01 | DOCX导出 | 生成A4排版Word文档：宋体正文、黑体标题、页眉页脚、答案独立分页 |
| E-02 | PDF导出 | 基于DOCX通过LibreOffice转换为PDF |
| E-03 | 临时下载链接 | 文件上传至COS，返回24小时有效期的签名URL |
| E-04 | 导出状态跟踪 | 更新paper.exported_at、paper.export_docx_url、paper.export_pdf_url |

---

## 前端页面

导出无独立页面。从试卷预览页或订单详情页触发，前端展示"生成中"Loading状态，完成后触发下载。

---

## 后端服务

| 服务 | 职责 |
|------|------|
| `ExportService` (NestJS) | 接收导出请求、校验支付状态、组装试卷数据、调度Python导出服务 |
| `ExportWorker` (Python Flask) | python-docx生成DOCX、LibreOffice转换PDF、上传COS |
| `COSService` | 生成临时签名URL（24h有效期） |

---

## 数据表

| 表 | 用途 |
|---|------|
| `paper` | 更新export_docx_url、export_pdf_url、exported_at |
| `paper_question_snapshot` | 读取题目快照用于文档生成 |

---

## API

| Method | Endpoint | Auth | 描述 |
|--------|----------|------|------|
| POST | `/v1/papers/{paperId}/export/docx` | JWT | 导出DOCX |
| POST | `/v1/papers/{paperId}/export/pdf` | JWT | 导出PDF |

### POST /v1/papers/{paperId}/export/docx

```
Precondition: order.status = paid
Response:
{
  "downloadUrl": "https://cos.example.com/exports/xxx.docx?sign=...",
  "expiresAt": "2026-05-30T12:00:00Z"
}
Errors: 40001 (未支付), 40002 (导出服务异常)
```

---

## 状态流转

```
支付完成
    │
    ▼
┌──────────────┐
│ 校验支付状态   │── 未支付 → 40001
└──────┬───────┘
       │ 已支付
       ▼
┌──────────────┐
│ 读取题目快照   │  ← paper_question_snapshot (含answer/analysis/score/difficulty/knowledgePoint)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Python导出    │
│              │
│ DOCX:        │
│ - A4页面      │
│ - 页眉: 试卷标题│
│ - 正文: 宋体   │
│ - 标题: 黑体   │
│ - 答案: 独立分页│
│ - 页脚: 页码   │
│              │
│ PDF:          │
│ - LibreOffice │
│   headless    │
│   convert-to  │
└──────┬───────┘
       │ ≤15秒
       ▼
┌──────────────┐
│ 上传至COS     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 返回签名URL   │  ← 24h有效期
└──────────────┘
```

### 导出文档格式规范

| 元素 | DOCX | PDF |
|------|------|-----|
| 纸张 | A4 (210×297mm) | A4 |
| 页边距 | 上下25mm 左右20mm | 同DOCX |
| 标题 | 黑体 16pt 居中 | 同DOCX |
| 正文 | 宋体 12pt 1.5倍行距 | 同DOCX |
| 选项 | 宋体 12pt 悬挂缩进 | 同DOCX |
| 页眉 | 试卷标题 宋体 9pt | 同DOCX |
| 页脚 | 页码居中 宋体 9pt | 同DOCX |
| 答案分页 | 分页符分隔，标题"参考答案" | 同DOCX |
