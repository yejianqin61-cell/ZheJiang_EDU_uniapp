# 练习模块设计 — 同步练 / 单元练 / 专题练 / 期中期末练

Version 2.0 | 2026-06-17

---

## 一、核心逻辑（关键纠正）

### 用户端：看不到试卷列表，只能点"AI智能抽取"

用户进入某个类目后，**看不到该目录下有哪些试卷文件**。页面只有一个按钮：

```
┌──────────────────────────────────────────┐
│                                          │
│   数学 · 五年级 · 第一单元 · 小数乘法     │
│                                          │
│        ┌──────────────────────┐          │
│        │  🤖 AI智能抽取题目    │          │
│        └──────────────────────┘          │
│                                          │
│   系统将从本类目随机抽取一份试卷           │
│                                          │
└──────────────────────────────────────────┘
```

点击后 → 系统从该类目下**随机挑一份试卷文件** → 展示预览 → 支付 → 下载。

**没有任何 AI 参与**，就是 `ORDER BY RANDOM() LIMIT 1`。

### 管理员端：完全可见，自由管理

管理员可以看到所有类目下的所有试卷文件，可以新增、删除、查看下载统计。

---

## 二、四种模块的业务规则

### 2.1 类目层级结构

```
科目 + 年级
  │
  ├── 单元练                         ← 管理员自由创建单元
  │     └── [单元名]                   ← 无下级，直接在单元下传试卷
  │
  ├── 同步练                         ← 课时必须归属到已有单元下
  │     └── [已有单元名]               ← 引用单元练中已创建的单元
  │           └── [课时名]             ← 管理员自由创建课时
  │                 └── 📄 试卷文件     ← 上传到课时下
  │
  ├── 专题练                         ← 管理员自由创建专题
  │     └── [专题名]                   ← 无下级，直接在专题下传试卷
  │
  └── 期中期末练                      ← 管理员自由创建
        └── [考试名]                   ← 如"2024年秋期中"
              └── 📄 试卷文件
```

| 模块 | 管理员创建什么 | 层级限制 |
|------|-------------|---------|
| 单元练 | 单元 | 单元下直接放试卷，无子级 |
| 同步练 | 课时 | **课时必须归属到已有的单元**（单元来自单元练） |
| 专题练 | 专题 | 专题下直接放试卷 |
| 期中期末练 | 考试类目 | 考试类目下直接放试卷 |

---

## 三、数据模型

### 3.1 三张表

```sql
-- 类目表（单元 / 专题 / 期中期末类目）
CREATE TABLE exercise_category (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        VARCHAR(16) NOT NULL,          -- 'unit' | 'topic' | 'exam'
    grade       VARCHAR(32) NOT NULL,
    subject     VARCHAR(32) NOT NULL,
    name        VARCHAR(128) NOT NULL,         -- "第一单元 小数乘法"
    sort_order  INTEGER DEFAULT 0,
    created_by  UUID REFERENCES "user"(id),
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_ecat_type ON exercise_category(type);

-- 课时表（只用于同步练，必须归属到已有单元）
CREATE TABLE exercise_lesson (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id     UUID NOT NULL REFERENCES exercise_category(id) ON DELETE CASCADE,
    name        VARCHAR(128) NOT NULL,         -- "第1课 小数乘整数"
    sort_order  INTEGER DEFAULT 0,
    created_by  UUID REFERENCES "user"(id),
    created_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_elesson_unit ON exercise_lesson(unit_id);

-- 试卷文件表
CREATE TABLE exercise_paper (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id     UUID REFERENCES exercise_category(id) ON DELETE CASCADE,   -- 单元练/专题练/期中期末 → 直接关联类目
    lesson_id       UUID REFERENCES exercise_lesson(id) ON DELETE CASCADE,     -- 同步练 → 关联课时
    title           VARCHAR(256) NOT NULL,
    file_url        VARCHAR(512) NOT NULL,
    file_type       VARCHAR(8) NOT NULL,       -- 'pdf' | 'docx'
    file_size       INTEGER,
    sort_order      INTEGER DEFAULT 0,
    created_by      UUID REFERENCES "user"(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    CONSTRAINT ep_owner CHECK (category_id IS NOT NULL OR lesson_id IS NOT NULL)
);
CREATE INDEX idx_ep_cat ON exercise_paper(category_id);
CREATE INDEX idx_ep_lesson ON exercise_paper(lesson_id);
```

### 3.2 为什么不把单元和课时存同一张表

单元 → 课时是严格的一对多。如果存自引用树（parent_id），会出现「课时下面还能建子节点」的歧义。分开两张表，层级关系一清二楚。

---

## 四、管理员端

### 4.1 页面布局

```
管理后台 → 练习管理

┌─ 筛选栏 ───────────────────────────────────┐
│  科目: [ 数学 ▾ ]  年级: [ 五年级 ▾ ]        │
└────────────────────────────────────────────┘

┌─ 单元练 ──────────────────────────────────┐
│                                            │
│  第一单元 小数乘法             [编辑] [删]   │
│    📄 单元测试A.pdf       12次下载  [删]    │
│    📄 单元测试B.pdf        8次下载  [删]    │
│    [ + 上传试卷 ]                          │
│                                            │
│  第二单元 位置                 [编辑] [删]   │
│    📄 单元测试.pdf          5次下载  [删]    │
│    [ + 上传试卷 ]                          │
│                                            │
│  [ + 新建单元 ]                             │
└────────────────────────────────────────────┘

┌─ 同步练 ──────────────────────────────────┐
│                                            │
│  ▶ 第一单元 小数乘法（来自单元练）           │
│    └── 第1课 小数乘整数       [编辑] [删]   │
│          📄 基础练习.pdf    15次下载  [删]  │
│          📄 提升练习.pdf    10次下载  [删]  │
│          [ + 上传试卷 ]                    │
│        └── 第2课 小数乘小数    [编辑] [删]  │
│              📄 课堂练习.pdf  6次下载  [删] │
│              [ + 上传试卷 ]                │
│    [ + 新建课时（选择单元）]                │
│                                            │
└────────────────────────────────────────────┘

┌─ 专题练 ──────────────────────────────────┐
│  几何图形初步                 [编辑] [删]   │
│    📄 三角形面积专项.pdf    20次下载  [删]  │
│    [ + 上传试卷 ]                          │
│                                            │
│  [ + 新建专题 ]                             │
└────────────────────────────────────────────┘

┌─ 期中期末练 ───────────────────────────────┐
│  2024年秋 期中                [编辑] [删]   │
│    📄 期中测试A卷.pdf       30次下载  [删]  │
│    [ + 上传试卷 ]                          │
│                                            │
│  [ + 新建考试类目 ]                         │
└────────────────────────────────────────────┘
```

### 4.2 新建课时时的单元选择

```
┌─ 新建课时 ───────────────────────────────┐
│                                          │
│  归属单元: [ 第一单元 小数乘法 ▾ ]  ← 下拉 │
│           （选项来自单元练已创建的单元）     │
│                                          │
│  课时名:  [ 第1课 小数乘整数 ]            │
│                                          │
│  [ 取消 ]  [ 保存 ]                       │
└──────────────────────────────────────────┘
```

---

## 五、用户端

### 5.1 首页入口

```
8 张功能卡片（现有 4 张 + 新增 4 张）：

  AI组卷     我的订单     教师贡献     打印服务
  📚 同步练   📖 单元练   🎯 专题练   📋 期中期末
```

### 5.2 抽取过程

用户导航到最终节点（单元/课时/专题/考试类目）后，只显示一个按钮。点击后的**加载过程只显示一句话**：

```
┌──────────────────────────────────────────────┐
│                                              │
│                                              │
│         ⏳  AI正在从题库中为你抽取试题         │
│                                              │
│                                              │
└──────────────────────────────────────────────┘
```

**不显示**：文件数量、类目名称、重新抽取次数、预计时间。就只有这行字。

后端 `ORDER BY RANDOM() LIMIT 1` 是毫秒级的，但前端加 1-2 秒的加载动画让用户感受到"AI 在工作"。

### 5.3 抽取结果 —— 复用 AI 组卷预览页

随机抽中一份试卷后，**直接复用现有 AI 组卷的试卷预览页**（`pages/paper/preview/index.vue`）：

```
┌──────────────────────────────────────────────┐
│  📄 基础练习卷.pdf                            │
│  共 3 页                                     │
│                                              │
│  (文件预览缩略图/基本信息)                     │
│                                              │
│  ═══════════════════════════════════════════  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  📥 下载服务                            │  │
│  │  支付后可下载 DOCX / PDF                │  │
│  │  ¥5.00                          [去支付]│  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  🖨️ 打印服务                            │  │
│  │  在线支付，我们打印好快递上门            │  │
│  │  ¥4.00~5.00/份                 [去下单]│  │
│  └────────────────────────────────────────┘  │
│                                              │
│  [ 重新抽取 ]                                │
└──────────────────────────────────────────────┘
```

完全复用现有 `pages/paper/preview` 的下载/打印分流卡片，走下单→支付→导出流程。

每天每类目可重新抽取 3 次。

### 5.4 四种模块的用户导航路径

```
同步练:
  选年级+科目 → 选单元 → 选课时 → [🤖 AI智能抽取] → 加载动画 → 预览页(下载/打印)

单元练:
  选年级+科目 → 选单元 → [🤖 AI智能抽取] → 加载动画 → 预览页(下载/打印)

专题练:
  选年级+科目 → 选专题 → [🤖 AI智能抽取] → 加载动画 → 预览页(下载/打印)

期中期末练:
  选年级+科目 → 选考试类目 → [🤖 AI智能抽取] → 加载动画 → 预览页(下载/打印)
```

---

## 六、API

### 6.1 管理员 API

| 端点 | 说明 |
|------|------|
| `GET /v1/admin/exercise-categories?type=&grade=&subject=` | 类目列表 |
| `POST /v1/admin/exercise-categories` | 新建类目 `{ type, grade, subject, name }` |
| `PUT /v1/admin/exercise-categories/:id` | 编辑类目 |
| `DELETE /v1/admin/exercise-categories/:id` | 删除类目 |
| `GET /v1/admin/exercise-lessons?unitId=` | 课时列表 |
| `POST /v1/admin/exercise-lessons` | 新建课时 `{ unitId, name }` |
| `PUT /v1/admin/exercise-lessons/:id` | 编辑课时 |
| `DELETE /v1/admin/exercise-lessons/:id` | 删除课时 |
| `POST /v1/admin/exercise-papers` | 上传试卷 `{ categoryId?, lessonId?, title, file }` |
| `DELETE /v1/admin/exercise-papers/:id` | 删除试卷 |
| `GET /v1/admin/exercise-papers?categoryId=&lessonId=` | 某类目/课时下的试卷列表（管理员可见） |

### 6.2 用户 API

| 端点 | 说明 |
|------|------|
| `GET /v1/exercise-categories?type=&grade=&subject=` | 浏览类目（公开） |
| `GET /v1/exercise-lessons?unitId=` | 浏览课时（公开） |
| `GET /v1/exercise-categories/:id/draw` | 🎯 **随机抽取**：返回该类目下随机一份试卷 |
| `GET /v1/exercise-lessons/:id/draw` | 🎯 **随机抽取**：返回该课时下随机一份试卷 |
| `GET /v1/exercise-papers/:id` | 试卷详情 + 文件 URL |

### 6.3 随机抽取逻辑

```sql
-- 从类目下随机抽取
SELECT * FROM exercise_paper
WHERE category_id = :id
ORDER BY RANDOM() LIMIT 1;

-- 从课时下随机抽取
SELECT * FROM exercise_paper
WHERE lesson_id = :id
ORDER BY RANDOM() LIMIT 1;
```

后端做限流：同一用户同一类目每天最多抽取 3 次（Redis 计数）。

### 6.4 支付

复用现有订单流程，type 新增 `'exercise'`：

```
POST /v1/orders { type: 'exercise', paperId: 'xxx' }
```

---

## 七、前端新增页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 练习首页 | `/exercises` | 4 个 Tab 入口，选类型 → 选年级科目 |
| 类目浏览 | `/exercises/unit/:id` 等 | 展示类目下的子节点 + 抽取按钮 |
| 抽取结果 | `/exercises/draw/:paperId` | 随机抽取结果展示 → 支付/重新抽取 |
| 管理端 | `/admin/exercises` | 类目 CRUD + 课时 CRUD + 试卷上传/管理 |

---

## 八、工时

| Phase | 内容 | 工时 |
|-------|------|------|
| Phase 1 | 3 张表 + Entity + 后端类目/课时/试卷 CRUD + 随机抽取 API | 1d |
| Phase 2 | 用户端：4 模块导航 + 抽取按钮 + 抽取结果页 + 重新抽取 | 1d |
| Phase 3 | 管理端：类目/课时管理 + 试卷上传/删除/统计 | 0.5d |
| Phase 4 | 支付对接 + 下载 | 0.5d |
| **合计** | | **3d** |

---

> **一句话总结**：管理员按「单元→课时→试卷」或「专题→试卷」或「考试→试卷」三级上传完整文件；用户只能看到「AI智能抽取题目」按钮，点一下随机派一份；实际上零 AI，就是 `ORDER BY RANDOM()`。
