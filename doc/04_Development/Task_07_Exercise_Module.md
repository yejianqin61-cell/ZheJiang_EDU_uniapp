# Task 07 — 练习模块（同步练/单元练/专题练/期中期末练）

**关联文档**：[Exercise_Module_Design](../03_Design/Exercise_Module_Design.md) · [Clarify](../02_Requirements/Exercise_Module_Clarify.md)  
**预估工时**：3 天

---

## 最终决策速查

| # | 决策 | 结论 |
|---|------|------|
| 1 | 定价 | 全局统一价（管理员在定价配置设） |
| 2 | 打印 | 同样适用练习模块 |
| 3 | **重新抽取** | **不允许**。抽到就必须付，不付就走 |
| 4 | 预览 | 展示第一页缩略图（后端生成 PNG） |
| 5 | 订单 type | 新增 `exercise`，直接返回 COS URL |
| 6 | 文件格式 | 只能下载原格式，不转换 |
| 7 | 试卷标题 | 管理员手动填写 |
| 8 | 同文件多类目 | 允许 |
| 9 | 期中期末 | 自由文本 + 学期/考试类型下拉 |
| 10 | 叶子节点强制 | 必须选到最终节点才显示抽取按钮 |
| 11 | 试卷数不显示 | 前端不暴露类目下有多少份试卷 |

---

## Phase 1：数据库 + 后端 (1d)

### 1. 数据库迁移

- [ ] `005_exercise_module.sql`

```sql
CREATE TABLE exercise_category (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        VARCHAR(16) NOT NULL,      -- 'unit' | 'topic' | 'exam'
    grade       VARCHAR(32) NOT NULL,
    subject     VARCHAR(32) NOT NULL,
    name        VARCHAR(128) NOT NULL,
    term        VARCHAR(32),               -- '上学期' | '下学期' (期中期末用)
    exam_type   VARCHAR(32),               -- '期中' | '期末' (期中期末用)
    sort_order  INTEGER DEFAULT 0,
    created_by  UUID REFERENCES "user"(id),
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE exercise_lesson (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id     UUID NOT NULL REFERENCES exercise_category(id) ON DELETE CASCADE,
    name        VARCHAR(128) NOT NULL,
    sort_order  INTEGER DEFAULT 0,
    created_by  UUID REFERENCES "user"(id),
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE exercise_paper (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id     UUID REFERENCES exercise_category(id) ON DELETE CASCADE,
    lesson_id       UUID REFERENCES exercise_lesson(id) ON DELETE CASCADE,
    title           VARCHAR(256) NOT NULL,
    file_url        VARCHAR(512) NOT NULL,
    file_type       VARCHAR(8) NOT NULL,
    file_size       INTEGER,
    page_count      INTEGER,
    thumbnail_url   VARCHAR(512),          -- 第一页缩略图
    download_count  INTEGER DEFAULT 0,
    sort_order      INTEGER DEFAULT 0,
    created_by      UUID REFERENCES "user"(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    CONSTRAINT ep_owner CHECK (category_id IS NOT NULL OR lesson_id IS NOT NULL)
);
```

### 2. Entity

- [ ] `exercise-category.entity.ts` 🆕
- [ ] `exercise-lesson.entity.ts` 🆕
- [ ] `exercise-paper.entity.ts` 🆕

### 3. 后端模块

- [ ] `backend/src/modules/exercise/exercise.module.ts` 🆕
- [ ] `exercise-category.service.ts` 🆕 — 类目 CRUD
- [ ] `exercise-lesson.service.ts` 🆕 — 课时 CRUD（校验 unit_id 必须存在且 type='unit'）
- [ ] `exercise-paper.service.ts` 🆕 — 试卷上传/删除/随机抽取
- [ ] `exercise.controller.ts` 🆕 — 管理员 API
- [ ] `exercise-public.controller.ts` 🆕 — 用户 API

### 4. API 清单

**管理员：**

| 端点 | 方法 | 说明 |
|------|------|------|
| `/admin/exercise-categories` | GET | 列表 `?type=&grade=&subject=` |
| `/admin/exercise-categories` | POST | 新建 `{ type, grade, subject, name, term?, examType? }` |
| `/admin/exercise-categories/:id` | PUT | 编辑 |
| `/admin/exercise-categories/:id` | DELETE | 删除（级联删课时+试卷） |
| `/admin/exercise-lessons` | GET | 列表 `?unitId=` |
| `/admin/exercise-lessons` | POST | 新建 `{ unitId, name }` |
| `/admin/exercise-lessons/:id` | PUT | 编辑 |
| `/admin/exercise-lessons/:id` | DELETE | 删除（级联删试卷） |
| `/admin/exercise-papers` | POST | 上传 `{ categoryId?, lessonId?, title, file }` |
| `/admin/exercise-papers/:id` | DELETE | 删除 |

**用户：**

| 端点 | 方法 | 说明 |
|------|------|------|
| `/exercise-categories` | GET | 浏览类目 `?type=&grade=&subject=` |
| `/exercise-lessons` | GET | 浏览课时 `?unitId=` |
| `/exercise-categories/:id/draw` | POST | 🎯 随机抽取（类目） |
| `/exercise-lessons/:id/draw` | POST | 🎯 随机抽取（课时） |
| `/exercise-papers/:id` | GET | 试卷详情 |
| `/exercise-papers/:id/thumbnail` | GET | 第一页缩略图 |

### 5. 随机抽取逻辑

```typescript
async draw(categoryId?: string, lessonId?: string, userId: string) {
  // 1. 查该用户是否已抽取过（今天 + 此节点）
  // 2. 如果已抽取 → 返回上次结果（不允许重新抽）
  // 3. 如果未抽取 → ORDER BY RANDOM() LIMIT 1
  // 4. 记录抽取日志（user_id, paper_id, node_id, created_at）
  // 5. 返回试卷信息
}
```

```sql
-- 从类目随机抽
SELECT * FROM exercise_paper WHERE category_id = :id ORDER BY RANDOM() LIMIT 1;

-- 从课时随机抽
SELECT * FROM exercise_paper WHERE lesson_id = :id ORDER BY RANDOM() LIMIT 1;
```

### 6. 缩略图生成

- [ ] Python `export-service/app.py` 新增端点 `POST /generate-thumbnail`
- [ ] 用 PyMuPDF 将 PDF 第一页渲染为 PNG（200px 宽）
- [ ] DOCX 文件 → LibreOffice 转 PDF → PyMuPDF 截第一页
- [ ] 上传试卷时异步生成缩略图

---

## Phase 2：用户端 (1d)

### 7. 首页卡片

- [ ] `pages/index/index.vue` — 新增第二排 4 张卡片

```
📝 AI组卷   📦 我的订单   📤 教师贡献   🖨️ 打印服务
📚 同步练   📖 单元练     🎯 专题练     📋 期中期末
```

### 8. 统一中间页 `pages/exercises/index.vue` 🆕

- [ ] 顶部：4 个 Tab（同步练/单元练/专题练/期中期末）
- [ ] 每个 Tab 下：选择年级 + 科目（复用组卷配置页的 el-select 组件）

### 9. 类目选择页 `pages/exercises/category.vue` 🆕

- [ ] 用户选好年级+科目+类型后 → 跳转此页
- [ ] 展示类目列表（单元列表 / 专题列表 / 考试类目列表）
- [ ] 对于同步练：选单元 → 再选课时
- [ ] 每条类目显示名称，**不显示试卷数量**
- [ ] 点击叶子节点 → 跳转抽取页

### 10. 抽取页 `pages/exercises/draw.vue` 🆕

- [ ] 显示「抽取」按钮 `🤖 AI智能抽取题目`
- [ ] 点击后 → **2 秒加载动画**

```
┌──────────────────────────────────────────────┐
│                                              │
│         ⏳  AI正在从题库中为你抽取试题         │
│                                              │
└──────────────────────────────────────────────┘
```

- [ ] 加载完毕 → 展示结果

```
┌──────────────────────────────────────────────┐
│  📄 基础练习卷.pdf                            │
│                                              │
│  ┌────────────────────────────────────┐      │
│  │                                    │      │
│  │    [第一页缩略图]                   │      │
│  │                                    │      │
│  └────────────────────────────────────┘      │
│                                              │
│  ═══════════════════════════════════════════  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  📥 下载服务  │  ¥5.00    [去支付]    │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  🖨️ 打印服务  │  ¥4.00~5.00 [去下单] │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

- [ ] **不显示重新抽取按钮**
- [ ] 下载/打印分流卡片 **复用** `pages/paper/preview` 的组件

### 11. 抽取状态保持

- [ ] 用户如果在抽取后关闭页面，下次回到同一类目时继续展示上次结果
- [ ] `draw_record` 表记录抽取历史：

```sql
CREATE TABLE exercise_draw_record (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL,
    node_type   VARCHAR(16) NOT NULL,  -- 'category' | 'lesson'
    node_id     UUID NOT NULL,
    paper_id    UUID NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);
```

---

## Phase 3：管理端 (0.5d)

### 12. 管理页面 `pages/admin/exercises/index.vue` 🆕

- [ ] 顶部筛选：科目 + 年级
- [ ] 4 个折叠面板（单元练/同步练/专题练/期中期末）
- [ ] **单元练面板**：
  - 单元列表 + 新建单元按钮
  - 每个单元下：试卷列表 + 上传按钮
  - 删除单元 → 级联确认
- [ ] **同步练面板**：
  - 显示所有单元（只读，来自单元练）
  - 每个单元下：课时列表 + 新建课时按钮
  - 每个课时下：试卷列表 + 上传按钮
- [ ] **专题练面板**：
  - 专题列表 + 新建专题按钮
  - 每个专题下：试卷列表 + 上传按钮
- [ ] **期中期末练面板**：
  - 考试类目列表 + 新建按钮
  - 每个类目下：试卷列表 + 上传按钮

### 13. 新建/编辑对话框

- [ ] 新建单元：`{ type:'unit', grade, subject, name }`
- [ ] 新建课时：`{ unitId, name }` — unitId 下拉来自已有单元
- [ ] 新建专题：`{ type:'topic', grade, subject, name }`
- [ ] 新建考试类目：`{ type:'exam', grade, subject, name, term?, examType? }`

### 14. 上传试卷对话框

- [ ] 表单：标题（手动输入）+ 文件（PDF/DOCX）
- [ ] 上传到 COS → 调生成缩略图 → 保存记录

---

## Phase 4：支付对接 + 定价 (0.5d)

### 15. 定价配置扩展

- [ ] `pricing_config` 表新增一条记录或配置新增字段

```
download.unitPrice  ← 现有（AI组卷按题计费）
exercise.unitPrice  ← 新增（练习模块统一价）
print.unitPrice     ← 现有（打印分档）
```

或者直接在 `pricing_config` 表新增 type='exercise' 记录。

- [ ] `admin/pricing/index.vue` 编辑页增加「练习试卷单价」

### 16. 订单 type

- [ ] `order.entity.ts` — type 枚举增加 `'exercise'`
- [ ] `order.service.ts` — `createOrder` 适配 exercise：
  - 不需要 paperId
  - 直接关联 exercise_paper.id
  - amount = pricing_config.exercise 单价
  - 支付成功后 `GET /orders/:id/download` → 直接返回 COS 文件 URL

### 17. 下载

- [ ] `exercise` 订单的下载不需要走 Python 导出
- [ ] 直接返回 COS 原始文件 URL（`window.open(url)`）
- [ ] 历史订单可重复下载

---

## 工时汇总

| Phase | 内容 | 工时 |
|-------|------|------|
| Phase 1 | 数据库 + Entity + 后端 CRUD + 随机抽取 + 缩略图 | 1d |
| Phase 2 | 用户端：首页卡片 + 中间页 + 类目选择 + 抽取页 | 1d |
| Phase 3 | 管理端：4 面板管理 + 上传/新建对话框 | 0.5d |
| Phase 4 | 定价 + 支付 + 下载 | 0.5d |
| **合计** | | **3d** |

---

## 验收标准

- [ ] 管理端可以创建单元/课时/专题/考试类目
- [ ] 同步练课时只能选择已有单元
- [ ] 上传试卷后生成第一页缩略图
- [ ] 用户选择叶子节点 → 点击抽取 → 2 秒动画 → 展示结果（缩略图 + 下载/打印卡片）
- [ ] 同一用户同一节点只允许抽取一次，不可重新抽取
- [ ] 前端不显示试卷总数
- [ ] 支付后下载原格式文件
- [ ] 历史订单可重复下载
