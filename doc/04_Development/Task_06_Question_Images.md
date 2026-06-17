# Task 06 — 题目图片支持

**关联文档**：[Question_Image_Design.md](../03_Design/Question_Image_Design.md)  
**预估工时**：2.5 天

---

## 目标

1. 题目可以带图片，Markdown `![](url)` 内嵌在 content 中
2. PDF 上传后 AI 自动提取图片 + 匹配到对应题目
3. 入库审核页图片可预览、可调整归属
4. 试卷预览、导出全程带图

---

## Phase 1：基础能力 (1 天)

### 1. 数据库 + Entity

- [ ] 迁移 SQL `004_question_images.sql`

```sql
ALTER TABLE question
  ADD COLUMN "images" JSONB DEFAULT '[]',
  ADD COLUMN "content_has_images" BOOLEAN DEFAULT FALSE;
```

- [ ] `question.entity.ts` 新增字段

```typescript
@Column({ type: 'jsonb', nullable: true, default: '[]' })
images: { url: string; caption?: string; width?: number; height?: number; position: number }[];

@Column({ type: 'boolean', default: false, name: 'content_has_images' })
contentHasImages: boolean;
```

- [ ] 删除旧 `dev.db`，编译验证

### 2. 图片上传端点

- [ ] `POST /v1/upload/image` — 单张图片上传到 COS

```
Request:  multipart/form-data { file }
Response: { code: 0, data: { url: "https://cos.xxx.com/questions/abc.png" } }

校验:
  ✅ 格式 png/jpg/gif/webp
  ✅ 大小 ≤ 5MB
  ✅ 尺寸 ≤ 2048×2048
  ✅ Dev 模式: 本地存储到 uploads/ 目录
```

- [ ] 文件：`backend/src/modules/admin/upload/image-upload.controller.ts` 🆕

### 3. Content 自动解析 images

- [ ] `question-manage.service.ts` — 保存题目时自动提取

```typescript
function extractImagesFromContent(content: string): ImageMeta[] {
  // 正则匹配 Markdown 图片: ![caption](url)
  const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match; const images = []; let pos = 0;
  while ((match = regex.exec(content)) !== null) {
    images.push({ url: match[2], caption: match[1] || '', position: pos++ });
  }
  return images;
}
```

### 4. 前端 Markdown 渲染

- [ ] `npm install markdown-it`
- [ ] `src/composables/useMarkdown.ts` 🆕

```typescript
import MarkdownIt from 'markdown-it'
const md = new MarkdownIt({ html: false, linkify: true })
export function renderMarkdown(text: string): string {
  if (!text) return ''
  return md.render(text)
}
```

- [ ] 4 个展示页面接入：
  - `paper/preview/index.vue` — 试卷预览渲染图片
  - `admin/review/detail/index.vue` — 审核详情渲染图片
  - `admin/questions/detail/index.vue` — 题库详情渲染图片
  - `contribute/preview/index.vue` — 贡献预览渲染图片

---

## Phase 2：PDF 图片提取 + 匹配 (1 天)

### 5. PDF 处理管线增强

- [ ] `pipeline.service.ts` — 新增图片提取步骤

```
现有流程:
  上传 → 提取文本 → 切题 → 解析标注 → 待审核

新流程:
  上传 → 提取文本 + 提取图片 → 切题 → 匹配图片 → 解析标注 → 待审核
```

- [ ] `services/image-extractor.service.ts` 🆕 — PDF 图片提取

```typescript
// 使用 pdf.js (pdfjs-dist) 提取 PDF 中的嵌入图片
async extractImages(fileBuffer: Buffer, fileType: string): Promise<ExtractedImage[]> {
  if (fileType !== 'pdf') return []; // 非 PDF 跳过
  
  const pdf = await pdfjsLib.getDocument(fileBuffer).promise;
  const images: ExtractedImage[] = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const ops = await page.getOperatorList();
    // 遍历渲染指令，找到图片资源
    for (let i = 0; i < ops.fnArray.length; i++) {
      if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
        const imgName = ops.argsArray[i][0];
        const imgData = await page.objs.get(imgName); // 原始图片数据
        images.push({ pageNum, name: imgName, data: imgData, y: /* 坐标 */ });
      }
    }
  }
  return images;
}
```

- [ ] 提取的图片 → 上传 COS → 记录 `{ pageNum, y, cosUrl }`

### 6. 图片匹配逻辑

- [ ] `services/image-matcher.service.ts` 🆕

```typescript
function matchImagesToQuestions(
  questions: ParsedQuestion[],    // AI切题结果，含页码+坐标
  images: ExtractedImage[]        // 提取的图片，含页码+坐标
): Map<string, ExtractedImage> {
  // 规则1: 同页图片归于同页题目
  // 规则2: 图片y坐标在题目y范围内 → 直接匹配
  // 规则3: 图片紧接题目下方(y差<50px) → 匹配
  // 规则4: 题目提到"如图""如图所示"且同页有未分配图片 → 匹配
  // 规则5: 未匹配的图片标记为"待认领"
}
```

### 7. 审核页增强

- [ ] `admin/review/detail/index.vue` — 显示匹配结果

```
题目详情页新增区域：

  ┌─ 配图 (AI自动匹配) ─────────────────────┐
  │                                          │
  │  ┌────────┐                              │
  │  │ 🖼️ 图1  │  ✅ 已匹配                   │
  │  └────────┘                              │
  │                                          │
  │  如果匹配错误：                            │
  │  [ 移除图片 ]  [ 从下方未匹配图片中选择 ▾ ] │
  └──────────────────────────────────────────┘

  ┌─ 未匹配的图片 ───────────────────────────┐
  │  ┌────────┐  ┌────────┐                 │
  │  │ 🖼️ 图3  │  │ 🖼️ 图4  │  ← 可能是无关图  │
  │  └────────┘  └────────┘                 │
  │  [ 分配给本题 ]  [ 忽略 ]                 │
  └──────────────────────────────────────────┘
```

---

## Phase 3：导出 + 收尾 (0.5 天)

### 8. DOCX 导出支持图片

- [ ] `export-service/app.py` — `add_question_images()`

```python
def add_question_images(doc, question):
    """将题目的配图插入 DOCX"""
    images = question.get('images', [])
    content = question.get('content', '')
    
    # 方案1: 解析 content 中的 ![](url) 并按位置插入
    import re
    parts = re.split(r'!\[([^\]]*)\]\(([^)]+)\)', content)
    for i, part in enumerate(parts):
        if i % 3 == 0:  # 文本
            if part.strip():
                doc.add_paragraph(part.strip())
        elif i % 3 == 2:  # URL
            try:
                response = requests.get(part, timeout=10)
                img_stream = BytesIO(response.content)
                doc.add_picture(img_stream, width=Inches(3.5))
            except:
                doc.add_paragraph(f'[图片加载失败: {part}]')
    
    # 方案2: 直接用 images JSON 字段
    for img in images:
        if img['url'] not in content:  # 避免重复
            response = requests.get(img['url'], timeout=10)
            doc.add_picture(BytesIO(response.content), width=Inches(3.5))
```

### 9. 图片上传组件

- [ ] `src/components/ImageUploader.vue` 🆕 — 可复用组件

```
<ImageUploader @uploaded="onImageUploaded" />

Props:  accept, maxSize
Events: uploaded({ url, name, size })
Slots:  自定义触发按钮
```

- [ ] 题库编辑页接入 `ImageUploader`

### 10. 全链路验证

- [ ] 上传一个含图片的 PDF → 检查图片是否提取
- [ ] 审核页确认图片匹配结果 → 通过入库
- [ ] 题库详情页查看配图显示
- [ ] 组卷生成 → 预览页图片正常渲染
- [ ] 导出 DOCX → 图片在文档中正确显示

---

## 工时汇总

| Phase | 内容 | 工时 |
|-------|------|------|
| Phase 1 | DB + 图片上传端点 + Markdown渲染 + 4页展示 | 1d |
| Phase 2 | PDF图片提取 + 自动匹配 + 审核页增强 | 1d |
| Phase 3 | DOCX导出带图 + 上传组件 + 全链路验证 | 0.5d |
| **合计** | | **2.5d** |

---

## 验收标准

- [ ] `POST /v1/upload/image` → 图片上传 COS → 返回 URL
- [ ] 题目 content 中 `![](url)` 在预览页正确渲染为图片
- [ ] PDF 上传后图片被自动提取 + 上传 COS
- [ ] 审核页显示 AI 匹配结果，可手动调整
- [ ] 导出 DOCX 文件中包含题目配图
- [ ] Dev 模式（无 COS）图片存储到本地 `uploads/` 目录
