# 练习试卷贡献模块 — 设计文档

**版本**: 1.1 | **日期**: 2026-06-17 | **状态**: 已确认（见 [Clarify](../../02_Requirements/Exercise_Contribution_Clarify.md)）

---

## 一、需求概述

允许普通教师用户上传练习试卷（同步练/单元练/专题练/期中期末练），经管理员审核通过后入库，上传者获得返现奖励。

### 与「题库贡献」的区别

| 维度 | 题库贡献（已有） | 练习试卷贡献（新增） |
|------|-----------------|---------------------|
| 上传内容 | DOCX/MD/PDF 含试题 | DOCX/PDF 整份试卷文件 |
| 处理方式 | AI 解析拆分→逐题审核 | 管理员下载查看→整卷审核 |
| 入库目标 | `question` 表 | `exercise_paper` 表 |
| 返现单位 | 每题 ¥1.00 | 每卷 ¥X.00（可配） |
| 用户可见 | 题库管理→审核→组卷 | 练习模块→抽取→下载/打印 |

---

## 二、数据库设计

### 2.1 新表：`teacher_exercise_upload`

```sql
CREATE TABLE teacher_exercise_upload (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES "user"(id),
    title           VARCHAR(256) NOT NULL,              -- 试卷标题
    subject         VARCHAR(32) NOT NULL,               -- 学科
    grade           VARCHAR(32) NOT NULL,               -- 年级
    exercise_type   VARCHAR(16) NOT NULL,               -- 'sync'|'unit'|'topic'|'exam'
    category_id     UUID REFERENCES exercise_category(id), -- 所属类目（教师上传时必选）
    lesson_id       UUID REFERENCES exercise_lesson(id),   -- 所属课时（同步练时可选）
    file_url        VARCHAR(1024) NOT NULL,             -- 文件存储路径
    file_type       VARCHAR(16) NOT NULL,               -- 'docx'|'pdf'|'doc'
    file_size       INTEGER,                            -- 文件大小(bytes)
    status          VARCHAR(16) DEFAULT 'pending_review', -- 'pending_review'|'approved'|'rejected'
    review_note     VARCHAR(512),                       -- 审核备注
    cashback_amount INTEGER DEFAULT 0,                  -- 返现金额(分)
    reviewed_by     UUID REFERENCES "user"(id),         -- 审核人
    reviewed_at     DATETIME,                           -- 审核时间
    created_at      DATETIME DEFAULT NOW(),
    updated_at      DATETIME DEFAULT NOW()
);
```

### 2.2 现有表变更

**`pricing_config`**：新增一条 `type = 'exercise_cashback'` 记录，`unit_price` 为每份通过试卷的返现金额（分）。默认 500（¥5.00/卷）。

不需要改表结构——`pricing_config` 已经是 key-value 模式，只需 `INSERT` 新行即可。

### 2.3 关系梳理

```
teacher_exercise_upload
  ├── user_id → user.id        （上传者）
  ├── reviewed_by → user.id    （审核人）
  └── 审核通过后 → exercise_paper （入库成为可抽取试卷）
```

---

## 三、后端设计

### 3.1 新增模块：`ExerciseContributionModule`

```
backend/src/modules/exercise-contribution/
  ├── exercise-contribution.module.ts
  ├── exercise-contribution.controller.ts      # 教师端 + 管理端
  └── services/
      ├── exercise-contribution.service.ts     # CRUD + 审核 + 返现
      └── exercise-contribution.service.spec.ts
```

### 3.2 API 端点

#### 教师端（需 JWT）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/exercise-contributions/upload` | 上传练习试卷文件 |
| GET | `/exercise-contributions` | 我的上传列表（分页） |
| GET | `/exercise-contributions/:id` | 上传详情 |
| DELETE | `/exercise-contributions/:id` | 删除草稿/被拒记录（仅限未审核） |

#### 管理端（需 JWT + admin）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/exercise-contributions` | 全部上传列表（可按状态筛选） |
| GET | `/admin/exercise-contributions/:id` | 上传详情（含下载链接） |
| POST | `/admin/exercise-contributions/:id/approve` | 审核通过 → 入库 + 返现 |
| POST | `/admin/exercise-contributions/:id/reject` | 审核拒绝 |

### 3.3 上传流程

```
POST /exercise-contributions/upload
  Content-Type: multipart/form-data
  Fields: title, subject, grade, exercise_type, category_name?, file

→ 保存文件到 uploads/exercises/{uuid}.{ext}
→ 写入 teacher_exercise_upload (status = 'pending_review')
→ 返回 upload id
```

### 3.4 审核通过流程

```
POST /admin/exercise-contributions/:id/approve

1. 校验 status = 'pending_review'
2. 读取 exercise_cashback 单价（默认 500 分）
3. 更新 teacher_exercise_upload: status='approved', cashback_amount=单价, reviewed_by, reviewed_at
4. INSERT INTO exercise_paper:
     title, file_url, file_type, file_size → 来自 upload
     category_id → 若有匹配类目则关联（可选，后续管理员手动归类）
5. 调用 BalanceService.addBalance(userId, cashback_amount, 'exercise_cashback', uploadId)
6. 返回成功
```

### 3.5 定价配置扩展

**`pricing.service.ts` 修改：**

- `seedDefaults()` 新增默认行：`{ type: 'exercise_cashback', unit_price: 500 }`（¥5.00/卷）
- `getPricingConfig()` 返回结构中新增 `exerciseCashback` 字段
- `updatePricing()` DTO 新增 `exerciseCashback?: { unitPrice: number }`

**`admin.controller.ts` 修改：**

- `PUT /admin/pricing` 支持更新 `exerciseCashback`

### 3.6 返现逻辑

复用现有 `BalanceService.addBalance()`：
```typescript
await this.balanceService.addBalance({
  userId: upload.userId,
  amount: cashbackAmount,    // 来自 pricing_config.exercise_cashback
  type: 'exercise_cashback',
  refId: uploadId,
  note: `练习试卷审核通过：${upload.title}`,
});
```

`BalanceLog.type` 新增枚举值 `'exercise_cashback'`（字符串类型，无需改表）。

---

## 四、前端设计

### 4.1 路由变更

`frontend-web/src/router/index.ts`：

```typescript
// 新增教师端路由
{ path: '/contribute/exercise-upload', component: ExerciseUpload },
{ path: '/contribute/exercise/:id',     component: ExerciseUploadDetail },

// 新增管理端路由
{ path: '/admin/exercise-contributions', component: AdminExerciseContributions },
```

### 4.2 页面清单

| 页面 | 路由 | 说明 |
|------|------|------|
| 练习试卷上传页 | `/contribute/exercise-upload` | 标题+学科+年级+类型+类目+文件 |
| 我的练习贡献列表 | 合入 `/contribute/index.vue`（Tab 切换） | 题库贡献 / 练习贡献 |
| 练习贡献详情 | `/contribute/exercise/:id` | 文件信息+审核状态+返现金额 |
| 管理端练习审核列表 | `/admin/exercise-contributions` | 表格+状态筛选+通过/拒绝 |
| 管理端定价配置 | 修改 `/admin/pricing` | 新增"练习返现"价格设置 |

### 4.3 上传页 UI

**`/contribute/exercise-upload`**（新增页面）：

```
┌──────────────────────────────────────────┐
│  面包屑：首页 › 我的贡献 › 上传练习试卷      │
├──────────────────────────────────────────┤
│  练习类型：[同步练] [单元练] [专题练] [期中期末] │
│  学科：    [下拉选择]                       │
│  年级：    [下拉选择]                       │
│  试卷标题：[文本输入]                       │
│  所属类目：[下拉选择已有类目]（必填）          │
│  所属课时：[下拉选择]（仅同步练显示，选填）     │
│  上传文件：[拖拽区域 .docx/.pdf]             │
│                                          │
│  [提交审核]                                │
└──────────────────────────────────────────┘
```

### 4.4 贡献列表页改造

**`/contribute/index.vue`** 增加 Tab：

```
┌──────────────────────────────────────────┐
│  我的贡献                                 │
│  [题库贡献]  [练习试卷贡献]        [上传]   │
├──────────────────────────────────────────┤
│  题库 Tab → 现有表格                      │
│  练习 Tab → 新表格（标题/类型/学科/状态/返现） │
└──────────────────────────────────────────┘
```

### 4.5 管理端审核页

**`/admin/exercise-contributions`**（新增页面）：

```
┌──────────────────────────────────────────────────────┐
│  练习试卷审核                                          │
│  筛选：[全部▼] [学科▼] [年级▼] [类型▼]    [搜索标题]    │
│  [全选] [批量通过] [批量拒绝]                            │
├──────────────────────────────────────────────────────┤
│  表格(多选)：标题 | 类型 | 学科 | 年级 | 上传者 | 时间 │
│  操作：[下载文件] [通过] [拒绝]                         │
│                                                      │
│  点击行 → 详情弹窗/侧栏：                               │
│    - 文件信息（标题、类型、大小）                         │
│    - 上传者信息（手机号）                                │
│    - 下载按钮                                          │
│    - 快速分类（关联到现有类目，可选）                      │
│    - 通过/拒绝按钮 + 备注                               │
└──────────────────────────────────────────────────────┘
```

### 4.6 定价配置页改造

**`/admin/pricing/index.vue`** 新增一节：

```
┌──────────────────────────────────────────┐
│  练习试卷返现                             │
│  每份通过审核的练习试卷返现：               │
│  [500] 分  （= ¥5.00 / 卷）              │
│                                          │
│  （已与题库返现分离，独立定价）              │
└──────────────────────────────────────────┘
```

---

## 五、交互流程

### 5.1 教师上传 → 审核 → 返现

```
教师端                        管理端
─────                        ─────
选择练习类型+学科+年级
  ↓
填写标题+上传文件
  ↓
POST upload → status=pending_review
  ↓                           GET 审核列表 → 看到新上传
  ↓                           [下载文件查看]
  ↓                           [通过] → 入库 exercise_paper
  ↓                              ↓
  ↓                           BalanceService.addBalance()
  ↓                              ↓
收到返现 ←──────────────────── 教师余额增加
  ↓
可在"我的贡献"查看状态+金额
  ↓
余额足够后可提现
```

### 5.2 审核通过后用户可见

审核通过后，试卷进入 `exercise_paper` 表。如果上传时选择了类目，则直接关联；否则管理员可在审核时手动归类。入库后，该试卷即可在练习模块中被学生/教师抽取到。

---

## 六、TypeScript 类型变更

`frontend-web/src/types/index.ts`：

```typescript
// 新增
export interface ExerciseUploadItem {
  id: string
  title: string
  subject: string
  grade: string
  exerciseType: 'sync' | 'unit' | 'topic' | 'exam'
  categoryName?: string
  fileUrl: string
  fileType: string
  fileSize?: number
  status: 'pending_review' | 'approved' | 'rejected'
  reviewNote?: string
  cashbackAmount: number
  createdAt: string
}

// 修改
export interface PricingConfig {
  download: { unitPrice: number; description: string }
  print: Array<{ tier: number; minQuantity: number; maxQuantity: number | null; unitPrice: number }>
  cashback: { unitPrice: number }                    // 题库返现（已有）
  exerciseCashback: { unitPrice: number }             // 练习返现（新增）
}
```

---

## 七、文件清单

### 新建文件

| 文件 | 说明 |
|------|------|
| `backend/src/database/entities/teacher-exercise-upload.entity.ts` | 实体定义 |
| `backend/src/database/migrations/008_exercise_contribution.sql` | 数据库迁移 |
| `backend/src/modules/exercise-contribution/exercise-contribution.module.ts` | 模块 |
| `backend/src/modules/exercise-contribution/exercise-contribution.controller.ts` | 控制器 |
| `backend/src/modules/exercise-contribution/services/exercise-contribution.service.ts` | 业务逻辑 |
| `backend/src/modules/exercise-contribution/services/exercise-contribution.service.spec.ts` | 测试 |
| `frontend-web/src/pages/contribute/exercise-upload/index.vue` | 练习上传页 |
| `frontend-web/src/pages/contribute/exercise-detail/index.vue` | 练习贡献详情 |
| `frontend-web/src/pages/admin/exercise-contributions/index.vue` | 管理端审核页 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `backend/src/app.module.ts` | 注册 ExerciseContributionModule |
| `backend/src/modules/print/services/pricing.service.ts` | seedDefaults + getConfig 新增 exerciseCashback |
| `backend/src/modules/print/dto/update-pricing.dto.ts` | DTO 新增 exerciseCashback |
| `backend/src/modules/admin/admin.controller.ts` | PUT pricing 支持 exerciseCashback |
| `frontend-web/src/router/index.ts` | 新增 4 条路由 |
| `frontend-web/src/pages/contribute/index.vue` | 新增"练习贡献"Tab |
| `frontend-web/src/pages/admin/pricing/index.vue` | 新增练习返现设置区域 |
| `frontend-web/src/api/modules/exercise.ts` | 新增上传 API 方法 |
| `frontend-web/src/types/index.ts` | 新增类型定义 |
| `frontend-web/src/components/AdminSidebar.vue` | 新增"练习审核"菜单项 |

---

## 八、验收标准

- [ ] 教师可在 `/contribute/exercise-upload` 上传练习试卷
- [ ] 上传后在"我的贡献"中可见（练习贡献 Tab）
- [ ] 管理端 `/admin/exercise-contributions` 可查看待审核列表
- [ ] 管理员可下载上传的原始文件
- [ ] 管理员可通过/拒绝，拒绝时填写备注
- [ ] 通过后试卷进入 `exercise_paper` 表，可在练习模块中被抽取
- [ ] 通过后教师收到返现，余额可查
- [ ] 管理端定价配置可设置"练习返现"单价
- [ ] 后端测试全部通过

---

## 九、预估工时

| 阶段 | 内容 | 工时 |
|------|------|------|
| Phase 1 | 数据库迁移 + 实体 | 0.5d |
| Phase 2 | 后端 CRUD + 审核 + 返现 | 1d |
| Phase 3 | 前端页面（上传/列表/详情） | 1d |
| Phase 4 | 管理端审核页 + 定价扩展 | 0.5d |
| Phase 5 | 联调测试 | 0.5d |
| **合计** | | **3.5d** |
