# Round 4 — 修复 + 联调 + 仪表盘 设计文档

**版本**: 1.0 | **日期**: 2026-06-17 | **状态**: 待确认

---

## 一、任务总览

| # | 任务 | 类型 | 预估 |
|---|------|------|------|
| 1 | 启动 export-service + 验证缩略图/导出 | 运维 | 0.25h |
| 2 | 修复练习模块 P0/P1 bugs | 修 bug | 1.5h |
| 3 | 练习贡献联调 | 验证 | 0.5h |
| 4 | 仪表盘 ECharts | 新功能 | 1h |
| **合计** | | | **3.25h** |

---

## 二、Task 1：export-service 启动 & 验证

### 2.1 启动步骤（无代码改动）

```bash
cd export-service
pip install -r requirements.txt
python app.py
# → Listening on :5000
```

### 2.2 验证项

- [ ] `curl http://localhost:5000/health` → 200
- [ ] 通过管理端上传一个 DOCX/PDF → 检查 `uploads/thumbnails/` 是否有 PNG 生成
- [ ] draw 页确认缩略图展示
- [ ] 生成试卷后下载 DOCX → `POST /v1/papers/:id/export/docx` → 返回下载链接

**关键依赖**：LibreOffice（PDF 导出需要）。如未安装，缩略图和 DOCX 仍可用，PDF 导出不可用。

---

## 三、Task 2：修复练习模块 bugs

### Bug 2.1 [P0] — 订单列表/详情不显示练习订单的试卷标题

**根因**：`order.service.ts` 的 `list()` 和 `getDetail()` 只查 `paper` 表，不查 `exercise_paper` 表。

**修复** (`backend/src/modules/order/order.service.ts`)：

```typescript
// getDetail() L238: paper query 加 fallback
const paper = await this.paperRepo.findOne({ where: { id: order.paperId }, select: [...] });
let paperTitle = paper?.title ?? '';
// Fallback: exercise paper
if (!paperTitle && order.type === 'exercise') {
  const ex = await this.paperRepo.manager.query(
    `SELECT title FROM exercise_paper WHERE id = ?`, [order.paperId]
  );
  paperTitle = ex[0]?.title ?? '';
}

// list() L197-201: 同样加 fallback
// 对所有 paperId 查 paper 表后，对缺失的 paperId，补查 exercise_paper 表
```

### Bug 2.2 [P0] — 练习定价未种入种子数据

**根因**：`seedDefaults()` 缺少 `type: 'exercise'` 行。

**修复** (`backend/src/modules/print/services/pricing.service.ts` L247)：

```typescript
// seedDefaults 加一行
this.repo.create({ type: 'exercise', tier: 1, minQuantity: null, maxQuantity: null, unitPrice: 500 }),
```

同时 `updatePricing()` 新增 `exercise` 处理：

```typescript
if (dto.exercise) {
  await this.repo.upsert({ type: 'exercise', tier: 1, ..., unitPrice: dto.exercise.unitPrice, updatedBy }, ['type', 'tier']);
}
```

`UpdatePricingDto` 新增字段：`exercise?: { unitPrice: number }`。

### Bug 2.3 [P0] — adminCreatePaper API 签名（潜在 bug）

**修复** (`frontend-web/src/api/modules/exercise.ts`)：

```typescript
// 改函数签名接受 FormData，防误用
export function adminCreatePaper(formData: FormData) {
  return api.post('/admin/exercise/papers', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
}
```

### Bug 2.4 [P1] — 支付页 type 不支持 'exercise'

**修复** (`frontend-web/src/pages/payment/index.vue`)：

```typescript
// L16: 类型扩展
const orderType = ref<'download' | 'print' | 'exercise'>(...)

// L80 标签显示
{{ orderType==='print'?'🖨️ 打印服务':orderType==='exercise'?'📚 练习服务':'📥 下载服务' }}
```

同步修复 `stores/order.ts` 的 `activeTab` 和 `create()` 类型签名。

### Bug 2.5 [P1] — 订单列表学科筛选排除练习订单

**修复** (`backend/src/modules/order/order.service.ts` L167-180)：

```typescript
// subject 筛选时也查 exercise_paper 表
if (subject) {
  // ...现有 paper 表查询...
  const exPapers = await this.paperRepo.manager.query(
    `SELECT id FROM exercise_paper WHERE ...` // 暂无 subject 字段——exercise_paper 没有 subject 列
  );
  // 合并 paperIds
}
```

**注意**：`exercise_paper` 表没有 `subject` 字段。如果要按学科筛选练习订单，需要通过 `exercise_category` 反查。短期方案：学科筛选仅对非-exercise 订单生效，exercise 订单不受影响。

### Bug 2.6 [P2] — 小修

- `admin/exercises/index.vue` 删除未使用的 `adminCreatePaper` import
- `exercises/category.vue` catch 块加 `ElMessage.error`

---

## 四、Task 3：练习贡献联调

### 4.1 全链路验证清单

```
1. 教师端上传
   → /contribute → [练习试卷贡献Tab] → [上传练习试卷]
   → 选类型+学科+年级+类目 → 上传 .docx
   → 提交成功 → 贡献列表可见 "待审核"

2. 管理端审核
   → /admin/exercise-contributions → 看到待审核记录
   → [下载文件] 确认内容正确
   → [通过]
   → 记录变为 "已通过"，返现 ¥5.00

3. 教师端确认
   → /contribute → 状态变为 "已通过"，返现显示 ¥5.00
   → /profile/balance → 余额增加 ¥5.00

4. 入库验证
   → /exercises → 选对应学科年级 → 类目列表可见
   → [AI抽取] → 抽到刚入库的试卷
   → 显示缩略图（如有）或占位符

5. 支付下载
   → [下载服务] → Mock 支付 → 订单页 → 下载文件
```

### 4.2 预期发现的联调问题

| 可能问题 | 排查方向 |
|---------|---------|
| 上传后贡献列表为空 | 检查后端 `GET /exercise-contributions` 返回 |
| 审核通过后 exercise_paper 未入库 | 检查 `categoryId` 是否正确关联 |
| 抽取不到刚入库的试卷 | 确认 `exercise_paper.category_id` 与 `exercise_category.id` 匹配 |
| 下载文件 404 | 确认 `/uploads` 代理 + 静态文件服务已启动 |

---

## 五、Task 4：仪表盘 ECharts

### 5.1 现状

`admin/dashboard/index.vue` 已有统计卡片（总题量/学科数/知识点数/待审核/今日订单/待处理打印）+ ECharts 图表骨架代码，但数据接口 `GET /v1/admin/questions/stats` 返回空数据。

### 5.2 修复方案

**后端** — 确认 `/admin/questions/stats` 返回完整数据：

检查 `backend/src/modules/admin/admin.controller.ts` 的 stats 端点和 `dashboard.service.ts`。确认返回结构包含：
```json
{
  "totalQuestions": 39,
  "bySubject": [{ "subject": "数学", "count": 27 }, ...],
  "byGrade": [{ "grade": "五年级", "count": 31 }, ...],
  "byDifficulty": [{ "level": 1, "label": "简单", "count": 22 }, ...],
  "totalKnowledgePoints": 50,
  "pendingReview": 5,
  "todayOrders": 3,
  "pendingPrint": 2
}
```

**前端** — 确认 ECharts 图表渲染（代码已有，仅需验证）：

- 学科分布饼图（`subjectChart` ref）
- 难度分布饼图（`difficultyChart` ref）
- 年级分布柱状图（`gradeChart` ref）

如果 `bySubject` 为空，图表区域显示 `el-empty`。

### 5.3 扩展：仪表盘新增练习相关统计

在 stats 卡片行末尾新增：
- **练习试卷数**：`SELECT COUNT(*) FROM exercise_paper`
- **待审核练习**：`SELECT COUNT(*) FROM teacher_exercise_upload WHERE status='pending_review'`

这需要扩展 `/admin/questions/stats` 或新增独立端点。建议扩展现有端点，加 `exercisePaperCount` 和 `pendingExerciseReview` 字段。

---

## 六、文件改动清单

| 任务 | 文件 | 改动 |
|------|------|------|
| Bug 2.1 | `backend/.../order/order.service.ts` | list() + getDetail() 加 exercise_paper fallback |
| Bug 2.2 | `backend/.../print/services/pricing.service.ts` | seedDefaults + updatePricing + DTO |
| Bug 2.2 | `backend/.../print/dto/update-pricing.dto.ts` | 新增 exercise 字段 |
| Bug 2.2 | `frontend-web/.../admin/pricing/index.vue` | 新增 exercise 定价输入 |
| Bug 2.3 | `frontend-web/.../api/modules/exercise.ts` | adminCreatePaper 改 FormData |
| Bug 2.4 | `frontend-web/.../payment/index.vue` | 类型扩展 + 标签 |
| Bug 2.4 | `frontend-web/.../stores/order.ts` | 类型扩展 |
| Bug 2.5 | `backend/.../order/order.service.ts` | subject 筛选不排除 exercise |
| Bug 2.6 | `frontend-web/.../admin/exercises/index.vue` | 删除未用 import |
| Bug 2.6 | `frontend-web/.../exercises/category.vue` | catch 块加提示 |
| 仪表盘 | `backend/.../admin/dashboard.service.ts` | stats 扩展 |
| 仪表盘 | `frontend-web/.../admin/dashboard/index.vue` | 图表验证 + 新卡片 |
| 联调 | 无代码改动 | 手动验证 |

---

## 七、验收标准

- [ ] export-service 启动成功，`/health` 返回 200
- [ ] 练习订单列表/详情显示正确标题
- [ ] 定价配置可设置练习价格
- [ ] 支付页对 exercise 订单显示「练习服务」
- [ ] 学科筛选不排除练习订单
- [ ] 贡献→审核→入库→抽取 全链路走通
- [ ] 仪表盘图表渲染正常
- [ ] 仪表盘显示练习统计数字
- [ ] `npm run build` 0 错误
