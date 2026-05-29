# 智能教辅组卷系统 PRD

> **文档用途**：本文档将直接作为 Claude Code 的输入，用于驱动开发。所有模块、接口、数据结构均已结构化拆分。
>
> **版本**：v1.0 — 2026-05-29
> **交付截止**：2026-06-15
> **开发资源**：2 名开发者 + Claude Code

---

## 0. 项目背景与目标

### 0.1 一句话定位
一个面向 K12 一线教师与教培机构教师的**智能组卷小程序**，由运营方（甲方）统一上传与管理教辅题库，教师通过小程序按多种方式（表单 / 对话 / 浏览）从已建知识库中**检索并组合**生成可打印试卷。

### 0.2 关键原则（不可违反）

| 编号 | 原则 | 说明 |
|---|---|---|
| P1 | **AI 不改写题目** | AI 只做检索 + 组合 + 排版，题目原文必须 100% 来自甲方知识库 |
| P2 | **教师无上传权** | 仅运营方可以上传资料、管理知识库 |
| P3 | **不用 Dify** | 自研后端 |
| P4 | **版权由甲方承担** | 系统不验证甲方上传内容的版权 |
| P5 | **小程序资质由甲方负责** | 教育类小程序备案由甲方办理 |

### 0.3 角色与权限矩阵

| 功能 | 运营方管理员 | 教师 |
|---|---|---|
| 登录管理后台 | ✅ | ❌ |
| 上传教辅资料 | ✅ | ❌ |
| OCR / 切片入库 | ✅ | ❌ |
| 审核 AI 标签 | ✅ | ❌ |
| 增 / 删 / 改 题目 | ✅ | ❌ |
| 管理教师账号 | ✅ | ❌ |
| 登录小程序 | ❌ | ✅ |
| 表单组题 | ❌ | ✅ |
| 对话组题 | ❌ | ✅ |
| 题库浏览挑题 | ❌ | ✅ |
| 导出 PDF | ❌ | ✅ |
| 查看历史卷子 | ❌ | ✅ |

---

## 1. 技术栈（推荐与理由）

| 层级 | 选型 | 理由 |
|---|---|---|
| 小程序 | **微信原生小程序**（不上 uni-app） | 单端交付、避免框架兼容坑、调试快 |
| 管理后台 | **React 18 + Vite + Ant Design 5** | Antd 表单 / 表格组件成熟，节省 UI 工时 |
| 后端 | **Python 3.11 + FastAPI** | 异步、自动生成 API 文档、与 AI 生态契合 |
| 数据库 | **PostgreSQL 16 + pgvector 扩展** | 关系数据 + 向量检索同一库，不引入 Milvus 等额外服务 |
| 对象存储 | **阿里云 OSS** | 存放 PDF / 图片 / 生成的试卷 |
| OCR | **阿里云读光 OCR (RecognizeAdvanced)** | 中文教辅识别准确率高，按量付费 |
| 大模型 API | **DeepSeek-V3（主）+ 通义千问 Qwen-Max（备）** | DeepSeek 便宜（输入 ¥1/M token）、中文好、用于检索增强；通义备份 |
| Embedding 模型 | **BGE-M3（开源，自部署）或 通义 text-embedding-v3** | 中文向量质量高 |
| 任务队列 | **Celery + Redis** | OCR / 切片是耗时任务，必须异步 |
| 部署 | **Docker Compose + 阿里云 ECS** | 单机一键部署，运维简单 |
| PDF 生成 | **WeasyPrint** | HTML → PDF，CSS 控制排版，支持中文 |

### 1.1 服务器资源建议
- **ECS**：4 核 8G，Ubuntu 22.04（约 ¥300/月）
- **RDS PostgreSQL**：2 核 4G，含 pgvector 扩展（约 ¥200/月）
- **Redis**：1G（约 ¥50/月）
- **OSS**：按量付费，预计 ¥50/月
- **OCR API**：按量付费，预计 ¥200-500/月（取决于上传量）
- **大模型 API**：按量付费，预计 ¥100-300/月

---

## 2. 数据库设计

### 2.1 表结构

#### `admin_users`（运营方账号）
```sql
CREATE TABLE admin_users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin',  -- 'super_admin' / 'admin'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);
```

#### `teacher_users`（教师账号）
```sql
CREATE TABLE teacher_users (
    id BIGSERIAL PRIMARY KEY,
    wx_openid VARCHAR(64) UNIQUE NOT NULL,
    wx_unionid VARCHAR(64),
    nickname VARCHAR(50),
    avatar_url VARCHAR(500),
    phone VARCHAR(20),
    school VARCHAR(100),
    subject VARCHAR(50),     -- 任教科目
    grade VARCHAR(50),       -- 任教年级
    status VARCHAR(20) DEFAULT 'active',  -- 'active' / 'disabled'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);
```

#### `materials`（上传的教辅资料）
```sql
CREATE TABLE materials (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,           -- 资料名称（如：浙教版数学八上）
    file_url VARCHAR(500) NOT NULL,       -- OSS 文件 URL
    file_type VARCHAR(20),                -- 'pdf' / 'image'
    file_size BIGINT,
    page_count INT,
    grade VARCHAR(20),                    -- 年级
    subject VARCHAR(20),                  -- 学科
    publisher VARCHAR(50),                -- 出版社（浙教版 / 人教版等）
    book_type VARCHAR(20),                -- 'textbook'(教材) / 'workbook'(教辅)
    ocr_status VARCHAR(20) DEFAULT 'pending',  -- 'pending' / 'processing' / 'done' / 'failed'
    parse_status VARCHAR(20) DEFAULT 'pending',-- 'pending' / 'processing' / 'done' / 'failed'
    uploaded_by BIGINT REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    error_msg TEXT
);
CREATE INDEX idx_materials_subject_grade ON materials(subject, grade);
```

#### `questions`（题目库）
```sql
CREATE TABLE questions (
    id BIGSERIAL PRIMARY KEY,
    material_id BIGINT REFERENCES materials(id) ON DELETE CASCADE,
    -- 题目内容
    stem TEXT NOT NULL,                   -- 题干（含 LaTeX）
    question_type VARCHAR(20) NOT NULL,   -- 'single_choice'/'multi_choice'/'fill_blank'/'short_answer'/'essay'/'judge'
    options JSONB,                        -- 选择题选项 [{"key":"A","text":"..."}]
    answer TEXT,                          -- 答案
    explanation TEXT,                     -- 解析（可空）
    -- 元数据
    grade VARCHAR(20),                    -- 年级 (如 '八年级')
    subject VARCHAR(20),                  -- 学科
    chapter VARCHAR(100),                 -- 章节
    knowledge_points TEXT[],              -- 知识点数组
    difficulty SMALLINT,                  -- 难度 1-5
    difficulty_source VARCHAR(20),        -- 'original'(原文已标) / 'ai'(AI标) / 'manual'(人工改)
    -- 状态
    review_status VARCHAR(20) DEFAULT 'pending',  -- 'pending'/'approved'/'rejected'
    reviewed_by BIGINT REFERENCES admin_users(id),
    reviewed_at TIMESTAMPTZ,
    -- 原始定位（便于追溯）
    source_page INT,
    source_text TEXT,                     -- OCR 原文片段
    -- 向量
    embedding VECTOR(1024),               -- BGE-M3 输出维度 1024
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_questions_subject_grade ON questions(subject, grade);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_review ON questions(review_status);
CREATE INDEX idx_questions_embedding ON questions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

#### `papers`（生成的试卷）
```sql
CREATE TABLE papers (
    id BIGSERIAL PRIMARY KEY,
    teacher_id BIGINT REFERENCES teacher_users(id),
    title VARCHAR(200),
    generate_mode VARCHAR(20),            -- 'form'/'chat'/'manual'
    config JSONB,                         -- 生成时的配置（年级、章节、难度等）
    question_ids BIGINT[],                -- 题目 ID 数组（有序）
    pdf_url VARCHAR(500),                 -- 生成的 PDF OSS URL（答案版）
    pdf_student_url VARCHAR(500),         -- 学生版（无答案）
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_papers_teacher ON papers(teacher_id);
```

#### `chat_sessions`（对话式组题的会话）
```sql
CREATE TABLE chat_sessions (
    id BIGSERIAL PRIMARY KEY,
    teacher_id BIGINT REFERENCES teacher_users(id),
    messages JSONB,  -- [{"role":"user","content":"..."},{"role":"assistant","content":"..."}]
    final_question_ids BIGINT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. 功能模块拆分（按交付优先级排序）

> 下面每个模块包含：**目标 / 详细步骤 / 接口定义 / 验收标准**。
> Claude Code 可按此顺序逐模块实现。

---

### 模块 M1：基础架构搭建 (预计 1.5 天)

#### M1.1 项目脚手架

**目标**：搭建可运行的最小骨架。

**步骤**：
1. 创建 monorepo 目录：
   ```
   project-root/
   ├── backend/        (FastAPI)
   ├── admin-web/      (React 管理后台)
   ├── miniprogram/    (微信小程序)
   ├── docker-compose.yml
   └── README.md
   ```
2. `backend/` 初始化：FastAPI + SQLAlchemy + Alembic + Celery + Redis 配置
3. `admin-web/` 初始化：Vite + React 18 + Antd 5 + React Router + Axios
4. `miniprogram/` 初始化：微信开发者工具创建空项目
5. 准备 `.env.example`：所有 API Key、数据库连接串

#### M1.2 数据库迁移

**步骤**：
1. 用 Alembic 初始化迁移：`alembic init alembic`
2. 写第一个 migration：创建第 2 节中所有表
3. 在 PostgreSQL 中启用 pgvector：`CREATE EXTENSION vector;`
4. 写一个种子脚本：创建超级管理员账号（用户名：admin，密码：从 `.env` 读取）

#### M1.3 Docker Compose

**步骤**：
1. 编写 `docker-compose.yml`，包含服务：
   - `postgres`（含 pgvector 镜像 `ankane/pgvector:latest`）
   - `redis`
   - `backend`（FastAPI 主进程）
   - `worker`（Celery worker）
   - `admin-web`（Nginx 静态托管）
2. 配置 volume 挂载日志目录
3. 验证 `docker-compose up -d` 能一次性启动

**验收**：
- 浏览器访问 `http://localhost:8000/docs` 看到 FastAPI Swagger
- 浏览器访问 `http://localhost:5173` 看到 Antd 空页面
- `docker-compose exec postgres psql -U postgres -d edu -c "\dx"` 能看到 `vector` 扩展

---

### 模块 M2：账号与权限 (预计 1 天)

#### M2.1 管理后台登录

**接口**：
```
POST /api/admin/auth/login
Body: { "username": str, "password": str }
Response: { "token": str, "user": { "id": int, "username": str, "role": str } }
```
- 用 JWT（python-jose），过期 7 天
- 密码用 bcrypt（passlib）哈希

**前端**：
- `/login` 页面（Antd Form）
- 登录成功后 token 存 localStorage，全局 axios interceptor 自动带上

#### M2.2 小程序教师登录

**步骤**：
1. 小程序端调用 `wx.login()` 获取 `code`
2. 后端接口换取 openid / unionid：
   ```
   POST /api/teacher/auth/login
   Body: { "code": str, "userInfo": {nickName, avatarUrl, ...} (optional) }
   Response: { "token": str, "user": { "id": int, "nickname": str, ... } }
   ```
3. 后端调微信 `jscode2session` API → 拿到 openid → upsert `teacher_users`
4. 返回 JWT token

#### M2.3 教师账号管理（后台）

**接口**：
```
GET    /api/admin/teachers?page=1&size=20&keyword=&status=
POST   /api/admin/teachers/{id}/disable
POST   /api/admin/teachers/{id}/enable
DELETE /api/admin/teachers/{id}
```

**前端页面**：`/admin/teachers` — 教师列表 + 搜索 + 启停按钮

**验收**：
- 管理员能登录后台
- 小程序模拟登录能拿到 token
- 后台能看到所有注册过的教师，能禁用某个教师后该教师立刻无法使用小程序

---

### 模块 M3：资料上传与 OCR 管线 (预计 3 天) 🔴 核心模块

#### M3.1 文件上传（管理后台）

**接口**：
```
POST /api/admin/materials/upload
Form Data: file (binary), name, grade, subject, publisher, book_type
Response: { "material_id": int, "file_url": str }
```

**步骤**：
1. 后端接收 multipart 文件
2. 上传到阿里云 OSS（用 oss2 SDK）
3. 在 `materials` 表插入一条记录，状态 `pending`
4. 发送 Celery 任务 `process_material(material_id)` 到队列

**前端**：`/admin/materials/upload` 页面
- 支持**拖拽 + 多文件批量**
- 显示上传队列：每个文件的进度、状态
- 上传完成后跳转到 `/admin/materials`

#### M3.2 OCR 任务（Celery worker）

**任务定义**：`backend/tasks/ocr.py::process_material(material_id)`

**步骤**：
1. 从 DB 读取 material 记录，更新 `ocr_status='processing'`
2. 从 OSS 下载文件到临时目录
3. **如果是 PDF**：
   - 用 `pdf2image` 转成图片（每页一张 PNG，DPI=200）
4. **对每页/每张图调用阿里云 OCR**：
   - SDK：`alibabacloud_ocr_api20210707`
   - 接口：`RecognizeAdvanced`（中文+表格+公式）
   - 拿到 OCR 结果文本（含位置信息）
5. 把所有页的 OCR 结果合并存入临时表 `ocr_results`（或直接传给下一步）
6. 更新 `ocr_status='done'`，触发下一步 `parse_questions(material_id)`

#### M3.3 题目结构化解析（Celery worker）🔴 难点

**任务定义**：`backend/tasks/parse.py::parse_questions(material_id)`

**目标**：从 OCR 文本中切出"一道一道题"，每题填入 `questions` 表。

**步骤**：

**Step 1：粗切分**
- 用正则识别题号模式（如 `^\d+\.` `^（\d+）` `^一、` `^【\d+】`）
- 按题号切分成 chunk
- **若正则失败**（OCR 噪声大），则进入 Step 2

**Step 2：LLM 辅助切分**
- 将整页 OCR 文本（按 1500 token 为窗口切片）喂给 DeepSeek
- Prompt 模板：
  ```
  你是一个教辅题目结构化助手。下面是一段 OCR 识别的教辅内容，请提取所有题目，按以下 JSON 数组格式返回，不要任何解释：
  [{
    "stem": "题干",
    "question_type": "single_choice|multi_choice|fill_blank|short_answer|essay|judge",
    "options": [{"key":"A","text":"..."}] 或 null,
    "answer": "答案" 或 null,
    "explanation": "解析" 或 null,
    "difficulty": 1-5 或 null,
    "knowledge_points": ["..."],
    "chapter": "..." 或 null,
    "source_text": "原始OCR片段"
  }]
  OCR内容：
  {ocr_text}
  ```
- 用 DeepSeek 的 JSON mode (`response_format={"type":"json_object"}`)

**Step 3：难度标签处理（方案 C 混合）**
- 如果 LLM 抽到了 `difficulty` 值（说明原文有标）→ `difficulty_source='original'`
- 如果 LLM 没抽到（返回 null）→ 单独再调一次 LLM：
  ```
  请根据题目内容评估难度（1=最简单, 5=最难），只输出数字：
  题目：{stem}
  ```
  → `difficulty_source='ai'`
- 写入 `questions` 表，状态 `review_status='pending'`

**Step 4：生成 Embedding**
- 对每个 `stem` 调用 BGE-M3（或通义 embedding API）生成 1024 维向量
- 写入 `questions.embedding`

**Step 5：完成**
- 更新 `materials.parse_status='done'`
- 推送一个 WebSocket 消息（可选）通知后台刷新

#### M3.4 上传进度查询接口

**接口**：
```
GET /api/admin/materials/{id}/status
Response: { "ocr_status": str, "parse_status": str, "question_count": int, "error_msg": str|null }
```

**前端**：`/admin/materials` 列表页轮询每 5 秒刷新

**验收**：
- 上传一个 10 页的 PDF 教辅
- 5 分钟内完成 OCR + 切片，列表显示题目数 > 0
- 抽查 5 道题，原文匹配率 ≥ 80%

---

### 模块 M4：题库管理（管理后台）(预计 2 天)

#### M4.1 题目列表与筛选

**接口**：
```
GET /api/admin/questions
Query: page, size, subject, grade, chapter, difficulty,
       question_type, review_status, keyword, material_id
Response: { "total": int, "items": [Question, ...] }
```

**前端**：`/admin/questions`
- Antd Table：题干（截断）、学科、年级、章节、难度、类型、审核状态、操作
- 上方筛选区：学科 / 年级 / 章节级联、难度滑块、类型多选、状态 Tag
- 关键词搜索（全文搜 stem）

#### M4.2 题目审核

**接口**：
```
GET    /api/admin/questions/{id}                    # 详情
PUT    /api/admin/questions/{id}                    # 编辑（题干/答案/难度/章节/知识点）
POST   /api/admin/questions/{id}/approve            # 通过
POST   /api/admin/questions/{id}/reject             # 拒绝
DELETE /api/admin/questions/{id}                    # 删除
POST   /api/admin/questions/batch-approve           # 批量通过 (body: ids[])
POST   /api/admin/questions/batch-reject            # 批量拒绝
```

**前端**：
- 题目详情抽屉（Drawer）：左侧 OCR 原文、右侧结构化字段（可编辑）
- "通过 / 拒绝 / 保存修改"按钮
- 列表支持多选 + 批量通过/拒绝

#### M4.3 难度修正

- 编辑题目时如果改了 `difficulty`，自动设 `difficulty_source='manual'`
- 管理员有权限随时改

**验收**：
- 上传完一份资料后，能在题库中看到所有切片出的题
- 能逐题审核 / 批量审核
- 拒绝的题目不会出现在小程序检索结果中

---

### 模块 M5：小程序首页与表单组题 (预计 2 天)

#### M5.1 小程序底部 Tab

三个 Tab：
- **组卷**（首页）
- **题库**
- **我的**

#### M5.2 组卷首页

**UI 设计**：
- 顶部三个大按钮：
  - 📝 **快速组卷**（表单）
  - 💬 **对话组卷**
  - 📚 **题库挑题**
- 下方："最近生成的卷子"列表（最多 5 条），点击进入详情

#### M5.3 表单组卷页

**路由**：`/pages/form-generate/index`

**表单字段**：
| 字段 | 类型 | 必填 | 数据来源 |
|---|---|---|---|
| 年级 | 单选 | ✅ | 字典 |
| 学科 | 单选 | ✅ | 字典 |
| 章节 | 级联（多选） | ❌ | 接口动态拉取 |
| 知识点 | 多选 | ❌ | 接口动态拉取 |
| 难度 | 范围（1-5） | ❌ | 默认全选 |
| 题型分布 | 自定义结构 | ✅ | 见下 |
| 试卷标题 | 文本 | ❌ | 默认"XX 卷" |

**题型分布字段**：
```
[
  {"type":"single_choice","count":10},
  {"type":"fill_blank","count":5},
  {"type":"short_answer","count":3},
  ...
]
```

#### M5.4 表单组卷接口

```
GET  /api/teacher/dict/chapters?subject=&grade=          # 章节字典
GET  /api/teacher/dict/knowledge-points?subject=&grade=  # 知识点字典

POST /api/teacher/papers/generate-by-form
Body: {
  "title": str,
  "grade": str,
  "subject": str,
  "chapters": [str, ...],
  "knowledge_points": [str, ...],
  "difficulty_min": int,
  "difficulty_max": int,
  "question_distribution": [{"type": str, "count": int}, ...]
}
Response: {
  "paper_id": int,
  "questions": [Question, ...]
}
```

**后端逻辑**：
1. 根据筛选条件 query `questions` 表（`review_status='approved'`）
2. 按每个 `question_type` 分组，从符合条件的池子里**随机抽**指定数量
3. 如果池子不够：
   - 返回部分结果 + `warning: "XX 类型题目不足，仅抽到 N 道"`
4. 创建 `papers` 记录，存 question_ids
5. 返回试卷预览

#### M5.5 试卷预览页

**路由**：`/pages/paper-preview/index?paper_id=`

**UI**：
- 顶部：试卷标题 + 生成时间
- 题目列表：按 question_ids 顺序渲染
  - 题干（支持 LaTeX，用 `mp-html` 或 `katex-mini`）
  - 选项
  - 答案（默认折叠，点击"查看答案"展开）
- 底部操作栏：
  - **更换题目**（单题换一道同类型同章节的）
  - **重新生成**（整卷重抽）
  - **导出 PDF**（见 M8）

**接口**：
```
POST /api/teacher/papers/{id}/replace-question
Body: { "question_index": int }   # 替换第 N 题
Response: { "new_question": Question }

POST /api/teacher/papers/{id}/regenerate
Response: { "questions": [...] }
```

**验收**：
- 教师能选条件生成卷子
- 数量不足时有清晰提示
- 能单题更换

---

### 模块 M6：对话式组题 (预计 2.5 天)

#### M6.1 设计思路

**核心**：用 LLM 把教师的自然语言需求 → 结构化 query → 走 M5.4 的检索逻辑。

**关键约束**：LLM 只负责"理解需求"和"挑选已有题目"，**绝对不能生成新题**。

#### M6.2 对话页 UI

**路由**：`/pages/chat-generate/index`

**UI**：
- 上方：消息流（用户消息靠右、AI 消息靠左）
- 下方：输入框 + 发送按钮 + 快捷短语（"再来 5 道""换难一点的""只要选择题"）
- 右上角："✅ 完成组卷"按钮

#### M6.3 对话接口

```
POST /api/teacher/chat/message
Body: {
  "session_id": int|null,    # 第一次为 null，后续传上次的
  "message": str
}
Response: {
  "session_id": int,
  "ai_message": str,          # 给教师看的自然语言回复
  "current_questions": [Question, ...]  # 当前已经组的题
}

POST /api/teacher/chat/{session_id}/finalize
Response: { "paper_id": int }   # 把会话固化为 papers 记录
```

#### M6.4 后端核心逻辑

**Step 1：意图解析**

每次用户发消息，把**完整对话历史**（包括当前已经组的题列表）传给 LLM：

```
你是一个智能组卷助手。教师正在与你对话组卷。
你只能从下方提供的"可用题库"中挑题，绝对不能自己生成题目。

可用题库统计：
- 八年级数学共 1234 题，其中：函数 200 题、几何 300 题...

当前已组题目（共 N 道）：
1. [选择 难度3] 题干...
2. ...

教师对话历史：
{messages}

请输出 JSON，包含以下字段：
{
  "action": "search" | "modify" | "remove" | "confirm" | "chat",
  "query": {              # 仅 action=search 时
    "subject": "...",
    "grade": "...",
    "chapter": [...],
    "difficulty_min": ...,
    "difficulty_max": ...,
    "question_type": "...",
    "count": ...,
    "keyword": "..."     # 可选语义关键词，用于向量检索
  },
  "remove_indices": [int],  # 仅 action=remove
  "reply": "给教师的自然语言回复"
}
```

**Step 2：执行动作**
- `action=search`：根据 query 走表单检索逻辑（支持向量检索：用 query.keyword 生成 embedding，用 pgvector cosine 取 top N）
- `action=modify`：换某些题
- `action=remove`：删除指定 index 的题
- `action=confirm`：调用 finalize 接口生成试卷

**Step 3：返回**
- 把当前的题列表 + AI 的自然语言回复发回小程序

#### M6.5 安全栅栏（防止 LLM 编题）

- 检索结果中**所有题目必须有真实 question_id**
- 渲染时只渲染数据库里的字段，**不渲染 LLM 输出的题目内容**
- LLM 即便胡说"我给你出了一道题..."，前端也不会显示，因为没有对应 question_id

**验收**：
- 教师能用自然语言对话组卷
- AI 能正确理解"再来 5 道""换简单点的""去掉第 3 题"等指令
- 即便诱导 AI 编题，最终卷子里也只有数据库中的题

---

### 模块 M7：题库浏览挑题 (预计 1.5 天)

#### M7.1 浏览页

**路由**：`/pages/library/index`

**UI**：
- 顶部筛选条：年级 / 学科 / 章节 / 难度 / 类型
- 题目列表（瀑布流或卡片）：题干预览 + 元信息标签 + 右上角"+ 加入卷子"按钮
- 浮动购物车按钮：显示已选题目数，点击展开已选列表
- 已选列表可拖动排序、删除

#### M7.2 接口

```
GET /api/teacher/questions/browse
Query: page, size, subject, grade, chapter, difficulty, question_type, keyword
Response: { "total": int, "items": [Question, ...] }

POST /api/teacher/papers/create-manual
Body: {
  "title": str,
  "question_ids": [int, ...]  # 有序
}
Response: { "paper_id": int }
```

**验收**：
- 能筛选 + 浏览题库
- 能勾选任意题目，按指定顺序组成卷子

---

### 模块 M8：PDF 导出 (预计 1.5 天)

#### M8.1 导出接口

```
POST /api/teacher/papers/{id}/export
Body: { "type": "with_answer" | "student" }
Response: { "pdf_url": str }   # 直接返回 OSS URL
```

#### M8.2 后端 PDF 生成

**技术**：WeasyPrint（Python 库）

**步骤**：
1. 根据 paper_id 拉取所有题目
2. 渲染 HTML 模板（用 Jinja2）：
   - 试卷标题 / 班级_____ / 姓名_____ / 分数_____
   - 各大题分类（选择题、填空题、解答题）
   - 题目编号、题干、选项、答题区
   - `with_answer` 版：每题下方附答案 + 解析
   - `student` 版：仅题干和答题区
3. WeasyPrint 渲染 HTML → PDF
4. 上传到 OSS，把 URL 写回 `papers.pdf_url` / `papers.pdf_student_url`
5. 返回 OSS URL

#### M8.3 HTML 模板要求

- A4 纸张，2.5cm 边距
- 中文字体：思源宋体 / Noto Serif CJK（确保 docker 镜像里装了）
- LaTeX 公式：用 KaTeX 服务端渲染（`katex` Python 包），或在模板中输出 KaTeX HTML
- 选择题选项 2 列布局
- 填空题留 1cm 下划线答题区
- 解答题留 5cm 空白答题区
- 分页：每题不被分页线截断（CSS `page-break-inside: avoid`）

#### M8.4 小程序下载 PDF

- 小程序调 `wx.downloadFile({url})` 下载到本地
- 调 `wx.openDocument({filePath, fileType:'pdf'})` 用微信内置预览打开
- 用户可点击右上角发送给文件传输助手 / 邮件 / 打印机

**验收**：
- 生成的 PDF 中文字体正常
- 数学公式正常显示
- 学生版没有答案
- 教师能在小程序里下载并打开 PDF

---

### 模块 M9：我的页面与历史卷子 (预计 0.5 天)

#### M9.1 我的页面（小程序）

- 头像 + 昵称 + 任教学校 / 科目 / 年级（可编辑）
- "我的卷子"（点进列表）
- "意见反馈"（简单表单，写入 DB）
- "退出登录"

#### M9.2 历史卷子列表

**接口**：
```
GET /api/teacher/papers?page=&size=
DELETE /api/teacher/papers/{id}
```

**UI**：列表显示标题、生成时间、题目数、生成方式（表单/对话/手动）、"导出 / 删除"按钮

---

### 模块 M10：使用统计（管理后台）(预计 0.5 天 — 可选)

#### M10.1 数据看板

**接口**：
```
GET /api/admin/stats/overview
Response: {
  "teacher_count": int,
  "question_count": int,
  "paper_count": int,
  "today_active_teachers": int,
  "today_papers_generated": int
}
```

**UI**：4 个 Statistic 卡片 + 一个折线图（最近 30 天每日生成卷子数）

---

### 模块 M11：部署上线 (预计 1 天)

#### M11.1 服务器准备

1. 阿里云 ECS（4 核 8G，Ubuntu 22.04）
2. 域名 + SSL 证书（Let's Encrypt）
3. Nginx 反向代理：
   - `/api/*` → backend (8000 端口)
   - `/admin/*` → admin-web (静态文件)

#### M11.2 微信小程序

1. 在微信公众平台注册小程序（甲方负责，提供 AppID 给开发）
2. 配置服务器域名（request / uploadFile / downloadFile）
3. 上传体验版，添加体验成员（甲方 + 测试老师）
4. **正式发布需备案**（甲方负责）

#### M11.3 上线检查清单

- [ ] 所有 `.env` 变量已配置
- [ ] 数据库已创建超级管理员
- [ ] OSS / OCR / LLM 三个 API 都能调通（写一个 `/api/admin/health` 接口）
- [ ] 上传一份资料，端到端跑通：OCR → 切片 → 审核 → 教师组卷 → 导出 PDF
- [ ] HTTPS 证书有效
- [ ] 日志写入文件，挂载 volume
- [ ] 数据库每日备份（cron + `pg_dump` → OSS）

---

## 4. 不做清单（写进合同附件，防加需求）

> **以下功能不在本次交付范围**。若甲方需要，作为二期单独报价。

| 不做项 | 说明 |
|---|---|
| 学生端 | 本系统仅供教师使用，学生不参与 |
| 在线答题 | 仅导出 PDF，不做线上答题 / 自动批改 |
| 教师社区 | 不做教师之间的题目分享、评论、点赞 |
| 班级管理 | 不做班级、学生关联、成绩录入 |
| AI 自由生成新题 | 严格遵守 P1 原则，AI 只检索不创作 |
| 教师上传题目 | 严格遵守 P2 原则，教师无上传权 |
| 多端 App（iOS/Android 原生） | 仅微信小程序 |
| 国际化 | 仅中文 |
| 复杂权限（角色细分） | 仅 super_admin / admin / teacher 三层 |
| 支付 / 订阅 / 计费 | 本次为甲方一次性交付，C 端收费由甲方后续自行接入 |
| 小程序备案 / 教育资质 | 由甲方负责 |
| 教辅资料版权 | 由甲方负责 |

---

## 5. 风险与应对

| 风险 | 应对 |
|---|---|
| OCR 准确率不达标 | 提供"OCR 原文"字段，运营方在审核时可手改；提示甲方上传文字版 PDF（非扫描件）效果更佳 |
| 题目切片错误（一题被切成两题，或两题合一） | 后台审核界面允许"合并/拆分"操作（M4 增强项，时间允许时做） |
| LLM 在对话组题时编造题目 | M6.5 已加栅栏：前端只渲染有真实 question_id 的题 |
| 题库不足导致筛选结果稀疏 | 接口返回 warning 字段，前端友好提示 |
| 微信小程序备案延迟 | 甲方负责，开发交付以"体验版可扫码使用"为准 |
| OCR / LLM API 调用超时 | Celery 任务带重试（最多 3 次），失败写入 `error_msg` |
| 服务器宕机 / 数据丢失 | M11.3 已加每日 `pg_dump` 备份 |

---

## 6. 时间表（12-17 天）

| 日期（建议） | 模块 | 负责人 |
|---|---|---|
| Day 1-2 | M1 基础架构、M2 账号 | 两人协同 |
| Day 3-5 | M3 OCR + 切片管线 🔴 | 后端为主 |
| Day 6-7 | M4 题库管理 | 一人后端 + 一人前端 |
| Day 8-9 | M5 表单组题 | 一人小程序 + 一人后端 |
| Day 10-12 | M6 对话组题 🔴 | 两人协同（提示词调优最耗时） |
| Day 13 | M7 题库浏览 | 一人 |
| Day 14 | M8 PDF 导出 | 一人 |
| Day 15 | M9 + M10 + 联调 | 两人协同 |
| Day 16 | M11 部署上线 | 两人协同 |
| Day 17 | Buffer / Bug 修复 | 两人协同 |

---

## 7. 给 Claude Code 的实施建议

1. **逐模块实现**：严格按 M1 → M11 顺序，前一个模块通过验收再开始下一个
2. **每个模块开始前**：先在 `/docs/M{X}.md` 输出实施计划，含目录结构、关键代码片段、测试方法
3. **共用代码**：所有 API 请求/响应模型放在 `backend/schemas/`；所有 DB 模型在 `backend/models/`
4. **环境变量**：所有外部依赖（DB、Redis、OSS、OCR、LLM）的 key 必须从 `.env` 读取，禁止硬编码
5. **日志**：所有 Celery 任务、外部 API 调用都用 `logging` 记录，输出到 `/var/log/app/`
6. **错误处理**：所有 API 接口统一错误格式：`{"error": {"code": str, "message": str}}`
7. **测试**：每个核心模块至少有一个端到端测试用例（pytest），写在 `backend/tests/`

---

**文档结束。**
