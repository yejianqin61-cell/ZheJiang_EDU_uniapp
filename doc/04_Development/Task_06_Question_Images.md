# Task 06 — 题目图片支持（重订版）

**关联文档**：[Question_Image_Design](../03_Design/Question_Image_Design.md)  
**当前进度**：40%（DB/上传/渲染/导出 OK，PDF 提取失败）  
**预估工时**：1.5 天

---

## 当前状态

| 功能 | 状态 | 问题 |
|------|------|------|
| DB：images JSONB + content_has_images | ✅ | |
| POST /v1/upload/image 手动上传 | ✅ | |
| 前端 Markdown 渲染图片 | ✅ | |
| DOCX 导出带图 | ✅ | |
| **PDF 自动提取图片** | ❌ | `pdfjs-dist` 在 Node 服务端拿不到图片数据 |
| AI 匹配图片到题目 | ⚠️ | 逻辑写了，但没图片进来所以没验证过 |

---

## 目标

用 **PyMuPDF** 替换 `pdfjs-dist`，实现 PDF 上传 → 自动提取嵌入图片 → AI 管线匹配到题目 → 审核页确认

---

## Phase 1：PyMuPDF 图片提取端点 (0.5d)

### 1.1 安装 PyMuPDF

- [ ] `export-service/` 中 `pip install PyMuPDF`
- [ ] 更新 `requirements.txt`

### 1.2 新增端点 `POST /extract-images`

- [ ] 接收 PDF 文件 → PyMuPDF 提取嵌入图片 → 返回 JSON

```python
@app.route("/extract-images", methods=["POST"])
def extract_images():
    """
    POST multipart/form-data { file: pdf }
    返回 { images: [{ pageNum, x, y, width, height, ext, cosUrl }] }
    """
    import fitz, base64, uuid
    file = request.files["file"]
    doc = fitz.open(stream=file.read(), filetype="pdf")
    images = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        for img in page.get_images(full=True):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            ext = base_image["ext"]
            # 上传 COS（生产） 或 本地存储（Dev）
            filename = f"{uuid.uuid4()}.{ext}"
            # Dev: 存本地 → 生产: 上传 COS
            save_path = os.path.join(UPLOAD_DIR, filename)
            with open(save_path, "wb") as f:
                f.write(image_bytes)
            cos_url = f"/uploads/images/{filename}"

            rects = page.get_image_rects(xref)
            for rect in rects:
                images.append({
                    "pageNum": page_num + 1,
                    "x": rect.x0,
                    "y": rect.y0,
                    "width": rect.width,
                    "height": rect.height,
                    "ext": ext,
                    "cosUrl": cos_url,
                })
    doc.close()
    return jsonify({"images": images})
```

### 1.3 验证

- [ ] 上传一个含图 PDF → 返回图片列表（页码+坐标+URL）
- [ ] 浏览器直接访问图片 URL 能看到图

---

## Phase 2：后端管线集成 (0.5d)

### 2.1 后端调 Python 提取服务

- [ ] `backend` 新增 `PdfImageService` — HTTP 调 Python `/extract-images`

```typescript
// src/modules/knowledge-base/services/pdf-image.service.ts
@Injectable()
export class PdfImageService {
  private exportUrl = process.env.EXPORT_SERVICE_URL || 'http://localhost:5000'

  async extractImages(fileBuffer: Buffer): Promise<ExtractedImage[]> {
    const formData = new FormData()
    formData.append('file', fileBuffer, { filename: 'upload.pdf' })
    const res = await axios.post(`${this.exportUrl}/extract-images`, formData)
    return res.data.images
  }
}
```

### 2.2 替换 ImageExtractorService

- [ ] 删除 `image-extractor.service.ts`（pdfjs-dist 版）
- [ ] 用 `PdfImageService` 替换
- [ ] 在 `PipelineService` 中集成：上传 PDF → 调 Python 提取图片 → 图片上传 COS → 存到 parsing result

### 2.3 管线流程

```
上传 PDF
  ↓
1. 调 Python extract-images → 拿到 [{ pageNum, x, y, cosUrl }]
  ↓
2. AI 切题 → 拿到 [{ pageNum, content, yStart }]
  ↓
3. ImageMatcher 匹配 → 同页+坐标重叠 → 图片归属题目
  ↓
4. 题目的 content 自动写入 ![](cosUrl)
  ↓
5. 审核页显示匹配结果
```

---

## Phase 3：审核页增强 + 验证 (0.5d)

### 3.1 审核详情页

- [ ] 显示 AI 匹配的配图（图片缩略图）
- [ ] 「移除图片」按钮 — 标记为无关
- [ ] 「未匹配图片」区域 — 拖拽/选择分配到当前题
- [ ] 图片归属信息随题目一起入库

### 3.2 全链路验证

- [ ] 上传含 3 张配图的 PDF
- [ ] 审核页看到 3 张图已匹配
- [ ] 确认无误差 → 通过入库
- [ ] 题库详情页看到配图
- [ ] 组卷预览看到配图
- [ ] 导出的 DOCX 包含图片

---

## Phase 4：清理 (0d，顺手)

- [ ] 卸载 `pdfjs-dist`：`npm uninstall pdfjs-dist`
- [ ] 删除 `__mocks__/pdfjs-dist.ts`
- [ ] 删除 `jest.config.ts` 中 pdfjs-dist 的 moduleNameMapper
- [ ] 删除 `image-extractor.service.ts`（Node 版）
- [ ] 跑测试确认 383 tests 全过

---

## 工时汇总

| Phase | 内容 | 工时 |
|-------|------|------|
| Phase 1 | Python PyMuPDF 提取端点 | 0.5d |
| Phase 2 | 后端调 Python + 管线集成 | 0.5d |
| Phase 3 | 审核页增强 + 全链路验证 | 0.5d |
| Phase 4 | 清理 pdfjs-dist | 0d |
| **合计** | | **1.5d** |
