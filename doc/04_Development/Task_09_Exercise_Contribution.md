# Task 09 — 练习试卷贡献模块

**关联文档**：[Exercise_Contribution_Module](../03_Design/Modules/Exercise_Contribution_Module.md) · [Clarify](../02_Requirements/Exercise_Contribution_Clarify.md)  
**预估工时**：3.5 天

---

## 需求确认速查

| # | 决策 | 结论 |
|---|------|------|
| Q1 | 上传入口 | 贡献页加 Tab：[题库贡献] [练习试卷贡献] |
| Q2 | 类目处理 | 上传时**强制选类目**，审核时管理员可修改 |
| Q3 | 返现分类型 | 统一价 `exercise_cashback` |
| Q4 | 教师定售价 | 平台统一定价 |
| Q5 | 删除被拒记录 | 可以删除 |
| Q6 | 显示抽取次数 | 不显示 |
| Q7 | 批量操作 | **支持**全选+批量通过/拒绝 |
| Q8 | 被拒后修改 | 不可修改，需重新上传 |
| Q9 | 文件格式 | 仅 `.docx` `.pdf` |
| Q10 | 菜单名 | 练习审核 |

---

## Phase 1：数据库 + 实体 (0.5d)

### 1.1 数据库迁移

- [ ] 创建 `008_exercise_contribution.sql`

```sql
CREATE TABLE teacher_exercise_upload (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES "user"(id),
    title           VARCHAR(256) NOT NULL,
    subject         VARCHAR(32) NOT NULL,
    grade           VARCHAR(32) NOT NULL,
    exercise_type   VARCHAR(16) NOT NULL,       -- 'sync'|'unit'|'topic'|'exam'
    category_id     UUID REFERENCES exercise_category(id),
    lesson_id       UUID REFERENCES exercise_lesson(id),
    file_url        VARCHAR(1024) NOT NULL,
    file_type       VARCHAR(16) NOT NULL,        -- 'docx'|'pdf'
    file_size       INTEGER,
    status          VARCHAR(16) DEFAULT 'pending_review',
    review_note     VARCHAR(512),
    cashback_amount INTEGER DEFAULT 0,
    reviewed_by     UUID REFERENCES "user"(id),
    reviewed_at     DATETIME,
    created_at      DATETIME DEFAULT NOW(),
    updated_at      DATETIME DEFAULT NOW()
);

CREATE INDEX idx_teu_user ON teacher_exercise_upload(user_id);
CREATE INDEX idx_teu_status ON teacher_exercise_upload(status);
CREATE INDEX idx_teu_subject_grade ON teacher_exercise_upload(subject, grade);
```

### 1.2 TypeORM 实体

- [ ] 创建 `backend/src/database/entities/teacher-exercise-upload.entity.ts`

```typescript
@Entity('teacher_exercise_upload')
export class TeacherExerciseUpload {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 256 })
  title: string;

  @Column({ type: 'varchar', length: 32 })
  subject: string;

  @Column({ type: 'varchar', length: 32 })
  grade: string;

  @Column({ type: 'varchar', length: 16, name: 'exercise_type' })
  exerciseType: string;

  @Column({ type: 'varchar', nullable: true, name: 'category_id' })
  categoryId: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'lesson_id' })
  lessonId: string | null;

  @Column({ type: 'varchar', length: 1024, name: 'file_url' })
  fileUrl: string;

  @Column({ type: 'varchar', length: 16, name: 'file_type' })
  fileType: string;

  @Column({ type: 'integer', nullable: true, name: 'file_size' })
  fileSize: number | null;

  @Column({ type: 'varchar', length: 16, default: 'pending_review' })
  status: string;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'review_note' })
  reviewNote: string | null;

  @Column({ type: 'integer', default: 0, name: 'cashback_amount' })
  cashbackAmount: number;

  @Column({ type: 'varchar', nullable: true, name: 'reviewed_by' })
  reviewedBy: string | null;

  @Column({ type: 'datetime', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

---

## Phase 2：后端 ExerciseContributionModule (1d)

### 2.1 模块骨架

- [ ] 创建目录 `backend/src/modules/exercise-contribution/`
- [ ] 创建 `exercise-contribution.module.ts`：导入 `TypeOrmModule.forFeature([TeacherExerciseUpload, ExerciseCategory, ExerciseLesson, ExercisePaper])`
- [ ] 在 `app.module.ts` 注册 `ExerciseContributionModule`

### 2.2 教师端 API

**Controller**：`exercise-contribution.controller.ts`（`@Controller('exercise-contributions')`，JWT 守卫）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/upload` | 上传练习试卷（multipart） |
| GET | `/` | 我的上传列表（分页，可选 status 筛选） |
| GET | `/:id` | 上传详情 |
| DELETE | `/:id` | 删除记录（仅限 `pending_review` 或 `rejected`） |
| GET | `/categories` | 获取可选类目列表（供上传页下拉） |

**Service**：`exercise-contribution.service.ts`

- [ ] `upload(userId, file, dto)` — 保存文件到 `uploads/exercises/`，写入 `teacher_exercise_upload`，status = `'pending_review'`
- [ ] `listMyUploads(userId, page, pageSize, status?)` — 分页查询，按 `created_at` 倒序
- [ ] `getDetail(id, userId)` — 单条详情（校验归属权）
- [ ] `delete(id, userId)` — 软删除或硬删除（校验归属权 + status 不是 `'approved'`）
- [ ] `listCategories(grade, subject)` — 查询 `exercise_category` 供教师选择

### 2.3 管理端 API

**Admin controller 扩展**：在 `admin.controller.ts` 或新建 controller

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/exercise-contributions` | 全部上传列表（分页，可按 status/subject/grade/type 筛选） |
| GET | `/admin/exercise-contributions/:id` | 详情（含下载链接） |
| POST | `/admin/exercise-contributions/:id/approve` | 单条通过 → 入库 + 返现 |
| POST | `/admin/exercise-contributions/:id/reject` | 单条拒绝（含 `reviewNote`） |
| POST | `/admin/exercise-contributions/batch` | 批量操作（`action: 'approve' | 'reject'` + `ids[]`） |

**审核通过流程**（service 方法）：

- [ ] `approve(id, reviewerId, categoryId?, lessonId?)`：
  1. 查 upload，校验 `status === 'pending_review'`
  2. 读 `exercise_cashback` 单价
  3. 更新 upload：`status='approved'`, `cashback_amount`, `reviewed_by`, `reviewed_at`
  4. `INSERT INTO exercise_paper (title, file_url, file_type, file_size, category_id, lesson_id, created_by)`
  5. `BalanceService.addBalance(userId, cashbackAmount, 'exercise_cashback', uploadId)`
  6. 返回 `{ paperId }`

- [ ] `reject(id, reviewerId, note)`：
  1. 查 upload，校验 `status === 'pending_review'`
  2. 更新 upload：`status='rejected'`, `review_note`, `reviewed_by`, `reviewed_at`

- [ ] `batchApprove(ids[], reviewerId)` — 遍历调用 `approve()`
- [ ] `batchReject(ids[], reviewerId, note)` — 遍历调用 `reject()`

### 2.4 定价配置扩展

**`pricing.service.ts`**：
- [ ] `seedDefaults()` 新增默认行 `{ type: 'exercise_cashback', unit_price: 500 }`
- [ ] `getPricingConfig()` 返回结构新增 `exerciseCashback: { unitPrice }`
- [ ] `getExerciseCashbackPrice()` 新方法，返回单价

**`update-pricing.dto.ts`**：
- [ ] 新增 `exerciseCashback?: { unitPrice: number }`

**`admin.controller.ts`**：
- [ ] `PUT /admin/pricing` 支持 `exerciseCashback` 字段

### 2.5 测试

- [ ] `exercise-contribution.service.spec.ts` — 覆盖 upload / approve / reject / batch / delete

---

## Phase 3：前端教师端页面 (1d)

### 3.1 贡献列表页改造

**文件**：[contribute/index.vue](frontend-web/src/pages/contribute/index.vue)

- [ ] 新增 Tab 切换：`[题库贡献]  [练习试卷贡献]`
- [ ] 练习贡献 Tab：
  - 表格列：标题 | 类型 | 学科 | 年级 | 状态 | 返现 | 提交时间
  - 操作列：详情 / 删除（仅 pending 或 rejected）
  - 顶部按钮：`[上传练习试卷]` → 跳 `/contribute/exercise-upload`
- [ ] 题库贡献 Tab：现有内容不变

### 3.2 练习试卷上传页

**文件**：[contribute/exercise-upload/index.vue](frontend-web/src/pages/contribute/exercise-upload/index.vue)（新建）

- [ ] 练习类型选择：4 个 Tab 卡片（同步练/单元练/专题练/期中期末）
- [ ] 学科下拉（10 科）
- [ ] 年级下拉（12 级）
- [ ] 试卷标题输入
- [ ] 类目下拉（根据 grade + subject + exercise_type 动态加载 `GET /exercise-contributions/categories`）
- [ ] 课时下拉（仅同步练显示，根据 category_id 动态加载）
- [ ] 文件上传（仅 `.docx` `.pdf`，显示文件信息）
- [ ] 提交按钮 → `POST /exercise-contributions/upload`（multipart/form-data）

### 3.3 练习贡献详情页

**文件**：[contribute/exercise-detail/index.vue](frontend-web/src/pages/contribute/exercise-detail/index.vue)（新建）

- [ ] 面包屑：首页 › 我的贡献 › 练习详情
- [ ] 信息卡片：标题、类型标签、学科、年级、文件类型、文件大小
- [ ] 状态标签：待审核/已通过/已拒绝
- [ ] 返现金额展示（已通过时显示 ¥X.XX）
- [ ] 拒绝原因展示（已拒绝时显示 review_note）
- [ ] 删除按钮（pending 或 rejected 时可用）

### 3.4 API 模块扩展

**文件**：[api/modules/exercise.ts](frontend-web/src/api/modules/exercise.ts)

- [ ] `uploadExercisePaper(formData: FormData)` → `POST /exercise-contributions/upload`
- [ ] `getMyExerciseUploads(params)` → `GET /exercise-contributions`
- [ ] `getMyExerciseUploadDetail(id)` → `GET /exercise-contributions/:id`
- [ ] `deleteMyExerciseUpload(id)` → `DELETE /exercise-contributions/:id`
- [ ] `getUploadCategories(params)` → `GET /exercise-contributions/categories`

### 3.5 路由

- [ ] `/contribute/exercise-upload` → `contribute/exercise-upload/index.vue`
- [ ] `/contribute/exercise/:id` → `contribute/exercise-detail/index.vue`

---

## Phase 4：前端管理端页面 (0.5d)

### 4.1 练习审核页

**文件**：[admin/exercise-contributions/index.vue](frontend-web/src/pages/admin/exercise-contributions/index.vue)（新建）

- [ ] 筛选栏：状态（全部/待审核/已通过/已拒绝）、学科、年级、类型
- [ ] 批量操作栏：全选、批量通过、批量拒绝（确认弹窗）
- [ ] 表格列（多选）：标题 | 类型 | 学科 | 年级 | 上传者手机号 | 提交时间 | 状态
- [ ] 行操作：下载文件（`window.open(fileUrl)`）、通过、拒绝
- [ ] 拒绝弹窗：填写备注（`review_note`）

### 4.2 定价配置页扩展

**文件**：[admin/pricing/index.vue](frontend-web/src/pages/admin/pricing/index.vue)

- [ ] 新增「练习返现」区域：
  - 输入框：每份通过试卷的返现金额（分）
  - 实时显示 ¥ 换算
  - 保存时一起提交

### 4.3 侧边栏菜单

**文件**：[components/AdminSidebar.vue](frontend-web/src/components/AdminSidebar.vue)

- [ ] 新增菜单项「练习审核」：路径 `/admin/exercise-contributions`，图标 `Checked`

### 4.4 路由

- [ ] `/admin/exercise-contributions` → `admin/exercise-contributions/index.vue`（admin 守卫）

---

## Phase 5：TypeScript 类型 + 联调测试 (0.5d)

### 5.1 类型定义

**文件**：[types/index.ts](frontend-web/src/types/index.ts)

- [ ] `ExerciseUploadItem`：id, title, subject, grade, exerciseType, categoryId?, lessonId?, fileUrl, fileType, fileSize?, status, reviewNote?, cashbackAmount, createdAt
- [ ] `PricingConfig` 新增 `exerciseCashback: { unitPrice: number }`

### 5.2 端到端测试

- [ ] 教师上传练习试卷 → 贡献列表可见
- [ ] 管理端审核列表可见 → 下载文件 → 通过
- [ ] 通过后教师余额增加（返现）
- [ ] 通过后被拒教师可删除记录
- [ ] 批量通过/拒绝正常工作
- [ ] 定价配置页可设置练习返现金额
- [ ] `npm run build` 0 错误

---

## 验收标准

- [ ] 教师端：贡献页双 Tab，练习上传页含类目选择，详情页含返现展示
- [ ] 管理端：练习审核列表含下载+批量操作，定价配置含练习返现
- [ ] 审核通过 → `exercise_paper` 入库 + 教师余额增加
- [ ] 审核拒绝 → 教师可见拒绝原因，可删除记录
- [ ] 后端测试全部通过
- [ ] 前端构建 0 错误

---

## 改动文件清单

| 文件 | 改动类型 | 风险 |
|------|---------|------|
| `backend/src/database/entities/teacher-exercise-upload.entity.ts` | 新建 | 低 |
| `backend/src/database/migrations/008_exercise_contribution.sql` | 新建 | 低 |
| `backend/src/modules/exercise-contribution/*` (5 文件) | 新建 | 中 |
| `backend/src/app.module.ts` | 修改 | 低 |
| `backend/src/modules/print/services/pricing.service.ts` | 修改 | 中 |
| `backend/src/modules/print/dto/update-pricing.dto.ts` | 修改 | 低 |
| `backend/src/modules/admin/admin.controller.ts` | 修改 | 低 |
| `frontend-web/src/pages/contribute/index.vue` | 重构 | 中 |
| `frontend-web/src/pages/contribute/exercise-upload/index.vue` | 新建 | 中 |
| `frontend-web/src/pages/contribute/exercise-detail/index.vue` | 新建 | 低 |
| `frontend-web/src/pages/admin/exercise-contributions/index.vue` | 新建 | 中 |
| `frontend-web/src/pages/admin/pricing/index.vue` | 修改 | 低 |
| `frontend-web/src/components/AdminSidebar.vue` | 修改 | 低 |
| `frontend-web/src/router/index.ts` | 修改 | 低 |
| `frontend-web/src/api/modules/exercise.ts` | 修改 | 低 |
| `frontend-web/src/types/index.ts` | 修改 | 低 |
| **共 20 个文件** | | |
