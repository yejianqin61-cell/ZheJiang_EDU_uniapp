# 题目图片支持 — 设计与改造方案

Version 1.0 | 2026-06-17

---

## 一、核心原则

1. **图片是题目的属性**，不是独立实体。一张图片属于一道题，不存在"题库共享图片库"
2. **内容存储用 Markdown**，图片语法 `![](url)` 直接内嵌在题目正文中
3. **数据库不加新表**，给 `question` 表加一个 `images` JSONB 字段存图片元数据
4. **组卷时原样传递**，生成 + 预览 + 导出全程带图
5. **人工审核确认**，AI 自动关联的图片必须人工审核后才能入库

---

## 二、数据模型

### 2.1 question 表改动

```sql
ALTER TABLE question
  ADD COLUMN "images" JSONB DEFAULT '[]',
  ADD COLUMN "content_has_images" BOOLEAN DEFAULT FALSE;

-- images 字段格式:
-- [
--   {
--     "url": "https://cos.xxx.com/questions/q001/img1.png",
--     "caption": "图1：三角形ABC",
--     "width": 400,
--     "height": 300,
--     "position": 1   -- 在题目中的位置顺序
--   }
-- ]

COMMENT ON COLUMN question.images IS '题目配图元数据';
COMMENT ON COLUMN question.content_has_images IS '题目内容是否包含图片引用';
```

### 2.2 题目内容格式

```
题目 content 字段使用 Markdown 存图片引用：

"已知在三角形ABC中，∠A = 30°，∠B = 60°，如图所示：\n\n
![三角形示意图](https://cos.xxx.com/questions/q001/img1.png)\n\n
(1) 求 ∠C 的度数\n
(2) 若 AB = 6cm，求 BC 的长度"
```

### 2.3 为什么不用独立表

| 方案 | 优点 | 缺点 |
|------|------|------|
| 独立 `question_image` 表 | 规范化 | 多一次 JOIN，图片永远和题目1:1绑定无意义 |
| JSONB 字段 | 一次查询拿到全部数据 | 不能按图片维度搜索（不需要） |

---

## 三、图片上传全流程

### 3.1 两阶段上传

```
阶段一：图片先上传到 COS（用户选文件 → 立即上传）

  管理员选文件 → POST /v1/upload/image → 返回 COS URL
  → 前端拿到 URL → 插入 Markdown `![](url)` 到编辑器

阶段二：题目入库时校验图片

  题目保存时 → 检查 content 中的图片 URL
  → 校验 URL 是否属于我们的 COS bucket（防止外链）
  → 写入 images JSONB 字段（从 content 中提取）
```

### 3.2 上传 API

```
POST /v1/upload/image

Request:  multipart/form-data { file }
Response: { url: "https://cos.xxx.com/questions/abc123.png" }

限制:
  - 格式: PNG / JPG / GIF / WebP
  - 大小: ≤ 5MB
  - 尺寸: ≤ 2048×2048
```

### 3.3 PDF 自动提取图片（可选，第二阶段）

```
PDF 上传
  ↓
pdf.js 解析 → 提取嵌入图片 → 批量上传 COS
  ↓
按页码+坐标关联到对应题目
  ↓
审核页显示：「检测到 3 张配图，请确认归属」
  ↓
管理员拖拽图片到对应题目 / 标记为无关图片
```

---

## 四、组卷时的图片处理

### 4.1 AI 生成阶段

```
用户组卷请求
  ↓
后端检索到候选题目（content 中已包含 ![](url) 的 Markdown）
  ↓
构建 Prompt 发给 AI（content + images JSON 一并传给 AI 做上下文）
  ↓
AI 返回试卷（题目内容直接复用原 content，图片 URL 已在其中）
  ↓
返回给前端（前端渲染 Markdown → 显示图片）
```

**关键**：AI 生成试卷时**不需要重新生成图片相关的内容**，直接复用题库中的题目 content。图片是题目的固有属性。

### 4.2 前端试卷预览

```
安装 markdown-it 渲染 Markdown：

<script setup>
import MarkdownIt from 'markdown-it'
const md = new MarkdownIt()

function renderContent(text: string) {
  return md.render(text)  // ![](url) → <img src="url">
}
</script>

<template>
  <div v-html="renderContent(question.content)" />
</template>
```

### 4.3 导出 DOCX

```
Python 导出服务：

def add_question_with_images(doc, question):
    # 1. 渲染段落文本
    # 2. 如果 images 字段非空且有 url，插入图片
    for img in question.get('images', []):
        response = requests.get(img['url'])     # 从 COS 下载
        image_stream = BytesIO(response.content)
        doc.add_picture(image_stream, width=Inches(3))
    # 3. 添加后续文本
```

---

## 五、改造项清单

### 5.1 数据库

| # | 任务 | 文件 |
|---|------|------|
| 1 | question 表新增 `images` JSONB + `content_has_images` boolean | `001_init.sql` + 新迁移 |
| 2 | Question entity 新增字段 | `question.entity.ts` |
| 3 | Question DTO 允许 images 字段 | `create-question.dto.ts` |

### 5.2 后端

| # | 任务 | 文件 |
|---|------|------|
| 4 | 图片上传端点 `POST /v1/upload/image` → COS → 返回 URL | `upload.controller.ts` 🆕 |
| 5 | 题目保存时自动提取 images 元数据 | `question-manage.service.ts` |
| 6 | 组卷返回的题目数据中携带 images | `paper.service.ts` |
| 7 | 导出 DOCX 支持插入图片 | `export-service/app.py` |

### 5.3 前端

| # | 任务 | 文件 |
|---|------|------|
| 8 | 安装 `markdown-it` | `package.json` |
| 9 | 题库管理详情页渲染图片 | `admin/questions/detail` |
| 10 | 入库审核详情页渲染图片 | `admin/review/detail` |
| 11 | 试卷预览页渲染图片 | `paper/preview` |
| 12 | 教师贡献预览页渲染图片 | `contribute/preview` |
| 13 | 文件上传页支持图片上传（选文件→上传COS→返回URL插入编辑器） | `admin/upload` |

### 5.4 COS 配置

| # | 任务 |
|---|------|
| 14 | COS Bucket 创建 `questions/` 目录 |
| 15 | COS 图片 URL 配置为公开读（或签名 URL） |

---

## 六、图片上传时的前端交互

```
题库管理 → 添加/编辑题目

  ┌─────────────────────────────────────────┐
  │  题干内容：                               │
  │  ┌─────────────────────────────────────┐ │
  │  │ 已知在三角形ABC中...              │ │
  │  │                                     │ │
  │  │ [📷 上传图片]                       │ │  ← 点击弹出文件选择
  │  │                                     │ │
  │  │ ![](https://cos.xxx.com/img1.png)   │ │  ← 上传后自动插入 Markdown
  │  │                                     │ │
  │  │ (1) 求 ∠C 的度数                   │ │
  │  └─────────────────────────────────────┘ │
  │                                          │
  │  📎 配图预览：                            │
  │  ┌────┐                                  │
  │  │ 🖼️ │  img1.png  [✕ 删除]             │
  │  └────┘                                  │
  └─────────────────────────────────────────┘
```

---

## 七、与甲方沟通话术

> "题目的图片支持我们已经设计好了。上传题目时可以用工具栏插入图片，图片会自动存储到云端。
> 
> 关于 PDF 批量导入带图片的题目——如果 PDF 里图文排版规整（一题一图，不跨页），AI 能自动识别 70% 左右。剩下的 30% 在审核环节人工调整，不会丢数据。
> 
> 但如果 PDF 排版非常复杂（图片跨页、多图混排、扫描件），就需要人工参与。这个问题**全行业都一样**，组卷网试题网也是大量人工建库的。"

---

## 八、工时评估

| 阶段 | 内容 | 工时 |
|------|------|------|
| Phase 1 | 图片基础能力（COS上传+Markdown渲染+数据库） | 1 天 |
| Phase 2 | 题目编辑页图片上传 + 预览 | 0.5 天 |
| Phase 3 | 所有展示页渲染图片（审核/预览/题库/贡献） | 0.5 天 |
| Phase 4 | DOCX 导出支持图片 | 0.5 天 |
| Phase 5 | PDF 自动提取图片（可选） | 1 天 |
| **合计** | | **2.5-3.5 天** |

---

> **结论**：图片存储技术上完全可行，用 Markdown `![](url)` 内嵌 + JSONB 元数据方案最简洁，全链路（生成/预览/导出）都通透。真正头疼的不是技术，是甲方对 PDF 自动解析的不切实际期待——这个需要用审核流程来兜底。
