# 练习试卷缩略图 — 设计文档

**版本**: 1.0 | **日期**: 2026-06-17 | **状态**: 设计中

---

## 一、现状分析

| 项目 | 状态 |
|------|------|
| `ExercisePaper.thumbnailUrl` 字段 | ✅ 已存在，可为 null |
| 管理员上传时生成缩略图 | ⚠️ 调用了 `generateThumbnail()` 但**未保存 URL 到数据库** |
| 教师贡献上传时生成缩略图 | ❌ 未调用 |
| `TeacherExerciseUpload` 缩略图字段 | ❌ 不存在 |
| 前端 draw 页展示缩略图 | ⚠️ 已写 `<img :src="paper.thumbnailUrl">` 但后端不返回 |

## 二、方案

### 2.1 缩略图生成时机

```
上传文件 (DOCX/PDF)
  → 保存到 uploads/exercises/
  → 异步调用 export-service /generate-thumbnail
  → 返回 PNG 缩略图
  → 保存缩略图到 uploads/thumbnails/
  → 回写 thumbnail_url 到数据库
```

- **管理员上传**：`ExerciseAdminController.createPaper()` 已有调用，需要补上「回写数据库」
- **教师贡献上传**：`ExerciseContributionController.upload()` 新增调用，`teacher_exercise_upload` 暂存 thumbnailUrl，审核通过后写入 `exercise_paper`
- **失败降级**：export-service 不可用时不阻塞上传，thumbnailUrl = null，前端显示文档图标占位

### 2.2 数据库变更

**`teacher_exercise_upload` 新增字段**：

```sql
ALTER TABLE teacher_exercise_upload ADD COLUMN thumbnail_url VARCHAR(512);
```

**TypeORM 实体同步更新**。

### 2.3 后端变更

**1. 提取公共缩略图服务**（避免两处重复代码）：

新建 `backend/src/modules/exercise/services/thumbnail.service.ts`

```typescript
@Injectable()
export class ThumbnailService {
  /**
   * 为上传文件生成缩略图，返回缩略图 URL（失败返回 null）
   */
  async generate(fileBuffer: Buffer, originalName: string): Promise<string | null> {
    // 1. 保存临时文件
    // 2. POST 到 EXPORT_SERVICE_URL/generate-thumbnail
    // 3. 下载返回的 PNG 到 uploads/thumbnails/
    // 4. 返回 /uploads/thumbnails/xxx.png
    // 5. 失败返回 null，打印 warning 日志
  }
}
```

**2. 管理员上传流程改造**：

`ExerciseAdminController.createPaper()`:
```
上传 → save → createPaper(..., thumbnailUrl) → 同步写 DB（不再异步 fire-and-forget）
```

**3. 教师贡献上传流程改造**：

`ExerciseContributionController.upload()`:
```
上传 → save → generateThumbnail → save thumbnailUrl to teacher_exercise_upload
```

**4. 审核通过时传递缩略图**：

`ExerciseContributionService.approve()`:
```
创建 exercise_paper 时带上 upload.thumbnailUrl
```

**5. Draw 端点返回 thumbnailUrl**：

`ExerciseService.draw()` 返回的 paper 对象已包含 `thumbnailUrl`（因为 ExercisePaper 实体有此字段），无需额外改动——只需确认查询时 SELECT 了该字段。

### 2.4 前端变更

**draw.vue** — 缩略图展示已写，但需加降级：

```html
<!-- 当前 -->
<img v-if="paper.thumbnailUrl" :src="paper.thumbnailUrl" />

<!-- 改为 -->
<img v-if="paper.thumbnailUrl" :src="paper.thumbnailUrl" />
<div v-else class="thumbnail-placeholder">
  📄 {{ paper.fileType?.toUpperCase() }} 文件
</div>
```

### 2.5 降级策略

如果 export-service 不可用（开发环境常见）：
- 上传成功，thumbnailUrl = null
- 前端显示文档图标占位符「📄 DOCX 文件」
- 后续 export-service 启动后，可手动触发缩略图生成（batch job，非必须）

---

## 三、任务清单

| Phase | 内容 | 文件 |
|-------|------|------|
| 1 | `ThumbnailService` 公共服务 | `backend/.../thumbnail.service.ts` 新建 |
| 2 | 管理员上传回写 thumbnailUrl | `exercise.controller.ts` 修改 |
| 3 | 教师上传生成缩略图 | `exercise-contribution.service.ts` + entity 修改 |
| 4 | 审核通过传递 thumbnailUrl | `exercise-contribution.service.ts` 修改 |
| 5 | 前端降级占位 | `draw.vue` 修改 |

## 四、预估工时

0.5 天（4 小时）
