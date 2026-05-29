# RBAC Permission Matrix — AI智能组卷小程序

Version 1.0 | 2026-05-29

---

## 1. Role Definitions

| Role | Code | Description |
|------|------|-------------|
| 普通教师 | `teacher` | 默认角色。微信登录自动分配。使用组卷、支付、导出功能。 |
| 管理员 | `admin` | 由系统管理员手动指定。拥有 teacher 全部权限 + 题库/知识库管理权限。 |

---

## 2. Permission Matrix

### Legend

- `C` = Create (创建)
- `R` = Read (读取)
- `U` = Update (更新)
- `D` = Delete (删除)
- `E` = Execute (执行/操作)
- `-` = 无权限

---

### 2.1 用户与认证

| # | Permission | Resource | teacher | admin | Notes |
|---|-----------|----------|:-------:|:-----:|-------|
| A01 | 微信登录 | auth:login | E | E | |
| A02 | 获取个人信息 | profile:self:read | R | R | |
| A03 | 查看其他用户信息 | profile:other:read | - | - | 任何角色均不可查看他人数据 |

---

### 2.2 AI 组卷

| # | Permission | Resource | teacher | admin | Notes |
|---|-----------|----------|:-------:|:-----:|-------|
| B01 | 创建组卷任务 | paper:generate | E | E | |
| B02 | 预览已生成试卷 | paper:preview | R | R | 仅预览本人生成的试卷 |
| B03 | 重新生成试卷 | paper:regenerate | E | E | 每日限制3次 |

---

### 2.3 支付

| # | Permission | Resource | teacher | admin | Notes |
|---|-----------|----------|:-------:|:-----:|-------|
| C01 | 发起微信支付 | payment:create | E | E | |
| C02 | 查看支付状态 | payment:read | R | R | 仅查看本人的支付记录 |

---

### 2.4 导出

| # | Permission | Resource | teacher | admin | Notes |
|---|-----------|----------|:-------:|:-----:|-------|
| D01 | 导出DOCX | export:docx | E | E | 需已完成支付 |
| D02 | 导出PDF | export:pdf | E | E | 需已完成支付 |

---

### 2.5 订单

| # | Permission | Resource | teacher | admin | Notes |
|---|-----------|----------|:-------:|:-----:|-------|
| E01 | 查看历史订单 | order:self:read | R | R | 仅查看本人订单 |
| E02 | 按条件筛选订单 | order:self:filter | R | R | |
| E03 | 重复下载导出文件 | order:redownload | E | E | 仅已支付订单 |
| E04 | 查看全部订单 | order:all:read | - | - | V1.0 不暴露任何角色 |

---

### 2.6 资料入库

| # | Permission | Resource | teacher | admin | Notes |
|---|-----------|----------|:-------:|:-----:|-------|
| F01 | 上传文件 | file:upload | - | C | |
| F02 | 查看上传进度 | file:progress | - | R | |
| F03 | 触发OCR处理 | ocr:execute | - | E | 系统自动触发 |
| F04 | 查看OCR结果 | ocr:read | - | R | |
| F05 | 触发AI题目解析 | parsing:execute | - | E | 系统自动触发 |
| F06 | 查看AI解析结果 | parsing:read | - | R | |
| F07 | 触发AI知识点识别 | knowledge:identify | - | E | 系统自动触发 |
| F08 | 触发AI难度识别 | difficulty:identify | - | E | 系统自动触发 |

---

### 2.7 入库审核

| # | Permission | Resource | teacher | admin | Notes |
|---|-----------|----------|:-------:|:-----:|-------|
| G01 | 查看待审核列表 | review:read | - | R | |
| G02 | 审核通过（单题） | review:approve | - | U | |
| G03 | 审核拒绝（单题） | review:reject | - | U | |
| G04 | 批量通过 | review:batch-approve | - | U | |
| G05 | 批量拒绝 | review:batch-reject | - | U | |

---

### 2.8 题库管理

| # | Permission | Resource | teacher | admin | Notes |
|---|-----------|----------|:-------:|:-----:|-------|
| H01 | 查看题库总览统计 | question:stats:read | - | R | |
| H02 | 查看题目列表 | question:list:read | - | R | |
| H03 | 查看题目详情 | question:detail:read | - | R | |
| H04 | 筛选题目 | question:filter | - | R | |
| H05 | 搜索题目 | question:search | - | R | |
| H06 | 删除单题 | question:delete | - | D | 软删除 |
| H07 | 批量删除题目 | question:batch-delete | - | D | 软删除 |
| H08 | 按文件删除题目 | question:delete-by-file | - | D | 软删除 |

---

### 2.9 知识点中心

| # | Permission | Resource | teacher | admin | Notes |
|---|-----------|----------|:-------:|:-----:|-------|
| I01 | 查看知识点列表 | knowledge-point:list:read | - | R | |
| I02 | 搜索知识点 | knowledge-point:search | - | R | |
| I03 | 筛选知识点 | knowledge-point:filter | - | R | |
| I04 | 新增知识点 | knowledge-point:create | - | - | **AI自动维护，任何人不可手动操作** |
| I05 | 修改知识点 | knowledge-point:update | - | - | **AI自动维护，任何人不可手动操作** |
| I06 | 删除知识点 | knowledge-point:delete | - | - | **AI自动维护，任何人不可手动操作** |

---

### 2.10 文件管理

| # | Permission | Resource | teacher | admin | Notes |
|---|-----------|----------|:-------:|:-----:|-------|
| J01 | 查看文件列表 | file:list:read | - | R | |
| J02 | 删除文件 | file:delete | - | D | 同时软删除关联题目 |

---

### 2.11 系统配置

| # | Permission | Resource | teacher | admin | Notes |
|---|-----------|----------|:-------:|:-----:|-------|
| K01 | 配置系统参数 | system:config | - | - | V1.0 不暴露前端，运维直接操作数据库 |

---

## 3. Permission Summary by Role

### 3.1 teacher (普通教师)

```
auth:login              E
profile:self:read       R
paper:generate          E
paper:preview           R
paper:regenerate        E
payment:create          E
payment:read            R
export:docx             E
export:pdf              E
order:self:read         R
order:self:filter       R
order:redownload        E
───────────────────────────
Total: 12 permissions
```

### 3.2 admin (管理员)

```
[继承 teacher 全部 12 项权限]
───────────────────────────
file:upload             C
file:progress           R
ocr:execute             E
ocr:read                R
parsing:execute         E
parsing:read            R
knowledge:identify      E
difficulty:identify     E
review:read             R
review:approve          U
review:reject           U
review:batch-approve    U
review:batch-reject     U
question:stats:read     R
question:list:read      R
question:detail:read    R
question:filter         R
question:search         R
question:delete         D
question:batch-delete   D
question:delete-by-file D
knowledge-point:list:read R
knowledge-point:search  R
knowledge-point:filter  R
file:list:read          R
file:delete             D
───────────────────────────
Total: 38 permissions (12 inherited + 26 additional)
```

---

## 4. Enforcement Rules

| Rule | Description |
|------|-------------|
| RE-01 | 每次请求必须携带有效JWT Token |
| RE-02 | Token过期(>24h)返回401，前端触发重新登录 |
| RE-03 | 后端Guard按资源:操作校验权限，无权限返回403 |
| RE-04 | 教师只能访问本人的试卷、订单和支付记录 (OpenID隔离) |
| RE-05 | 知识点写操作(C/U/D)被系统级禁用，即使admin也无权限 — 完全由AI维护 |
| RE-06 | 导出接口校验订单支付状态，未支付返回402 Payment Required |
| RE-07 | 软删除记录在数据库层面过滤 (is_deleted = false)，应用层无需重复判断 |
