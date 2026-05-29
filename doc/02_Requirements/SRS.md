# Software Requirements Specification (SRS)

## AI智能组卷小程序

Version 1.0 | 2026-05-29

---

# 1. Introduction

## 1.1 Purpose

本文档定义AI智能组卷小程序的完整软件需求规格，涵盖功能需求、非功能需求、外部接口及系统约束。目标受众为开发团队、测试团队及项目干系人。

## 1.2 Scope

AI智能组卷小程序是面向浙江省中小学教师的AI组卷平台，以微信小程序为载体，提供从试卷生成到支付导出的一站式服务。系统同时包含管理后台，供管理员维护题库与知识库。

### 包含 (V1.0)

- 微信授权登录
- AI智能组卷（基于知识库检索+大模型生成）
- 试卷在线预览
- 微信支付（按次付费）
- Word / PDF 导出
- 历史订单管理
- 管理后台：文件上传、OCR识别、AI题目解析、AI知识点/难度识别、题库管理、知识点中心、入库审核

### 不包含 (V1.0)

- 教师自主上传题库、UGC题库
- AI仿题、AI改编题
- 会员体系、数据分析后台
- 云打印服务
- Web端、Android App、iOS App
- AI聊天助手

## 1.3 Definitions and Acronyms

| Term | Definition |
|------|-----------|
| OCR | Optical Character Recognition，光学字符识别 |
| RBAC | Role-Based Access Control，基于角色的访问控制 |
| JWT | JSON Web Token |
| COS | 腾讯云对象存储 |
| Embedding | 文本向量化表示 |
| pgvector | PostgreSQL向量扩展插件 |
| OpenID | 微信用户唯一标识 |
| PaddleOCR | 百度开源OCR引擎 |

## 1.4 References

- [AI智能组卷小程序 PRD](../Product/AI智能组卷小程序%20PRD（产品需求文档）.md)

---

# 2. Overall Description

## 2.1 Product Perspective

本系统为全新开发的独立系统，由以下子系统构成：

```
┌─────────────────────────────────────────────┐
│              微信小程序 (UniApp)              │
├─────────────────────────────────────────────┤
│             NestJS 后端服务                   │
├───────┬────────┬───────┬────────┬──────────┤
│用户系统│权限系统│支付系统│知识库系统│AI服务    │
├───────┴────────┴───────┴────────┴──────────┤
│       PostgreSQL + pgvector                 │
├─────────────────────────────────────────────┤
│   腾讯云 COS  │  PaddleOCR  │  Python导出    │
└─────────────────────────────────────────────┘
```

## 2.2 User Characteristics

| Role | 描述 | 技术熟练度 |
|------|------|-----------|
| 普通教师 (Teacher) | 浙江省中小学教师，使用系统组卷 | 基础水平，需简洁直观的交互 |
| 管理员 (Admin) | 负责题库建设与维护的教务/IT人员 | 中等水平，需高效的批量操作能力 |

## 2.3 Operating Environment

- **客户端**: 微信小程序（iOS/Android 微信客户端内运行）
- **服务端**: Docker容器化部署于腾讯云ECS（8核16G / 100GB SSD）
- **网络**: 全站HTTPS，微信小程序要求合法备案域名

## 2.4 Design and Implementation Constraints

- 前端框架: UniApp + Vue3 + TypeScript
- 后端框架: NestJS + Node.js + TypeScript
- 数据库: PostgreSQL + pgvector
- 主LLM: Qwen3；备用LLM: DeepSeek-V4
- OCR引擎: PaddleOCR
- 导出服务: Python (python-docx + LibreOffice)
- 文件存储: 腾讯云COS
- 支付通道: 微信支付
- 鉴权: JWT + RBAC

## 2.5 Assumptions and Dependencies

- 微信小程序已通过审核并上线
- 微信支付商户号已开通
- 腾讯云COS Bucket已创建
- LLM API Key已配置
- 教师用户拥有微信账号
- 管理员通过后台指定，不开放自主注册

---

# 3. System Features

## 3.1 User-Facing Features (教师端)

### SRS-001 微信登录

**Priority**: P0 (Must-have)

用户通过微信授权登录。系统调用 `wx.login()` 获取临时code，后端通过微信API换取OpenID，查询或创建用户记录，返回JWT Token。

**Input**: 微信授权code
**Output**: JWT Token, 用户身份(OpenID), 用户角色(teacher / admin)

**Business Rules**:
- BR-001: 首次登录自动创建用户记录，默认角色为 teacher
- BR-002: JWT有效期24小时，过期需重新授权
- BR-003: 管理员角色由后台手动指定

---

### SRS-002 AI智能组卷

**Priority**: P0 (Must-have)

教师配置组卷条件后，系统从知识库检索匹配题目，构建Prompt调用大模型生成试卷。

**组卷条件**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 年级 | Enum | 是 | 小学1-6年级 / 初中7-9年级 / 高中10-12年级 |
| 科目 | Enum | 是 | 语文/数学/英语/物理/化学/生物/政治/历史/地理 |
| 知识点 | MultiSelect | 否 | 由科目联动过滤；不选则全知识点范围内选题 |
| 难度 | Enum | 是 | 简单(Level1) / 中等(Level2) / 困难(Level3) / 混合 |
| 题量 | Integer | 是 | 1-50题 |

**处理流程**:
1. 根据条件从题库(pgvector)做语义相似度检索，召回Top-N候选题目
2. 按难度分布与题量要求筛选
3. 构建Prompt（含题目格式要求、知识点覆盖、难度分布约束）
4. 调用LLM生成试卷（组合现有题+必要时生成新题）
5. 返回结构化试卷数据

**Output（教师端展示）**:

```json
{
  "paperId": "uuid",
  "title": "五年级数学单元练习卷",
  "questions": [
    {
      "index": 1,
      "type": "single_choice",
      "content": "题目正文",
      "options": ["A", "B", "C", "D"]
    }
  ],
  "generateTime": 28
}
```

教师端仅展示题目内容与选项。答案、解析、分值、难度、知识点等元数据仅在服务端存储，支付导出时随文件输出，前端不暴露。

**Business Rules**:
- BR-004: 组卷必须在30秒内完成
- BR-005: 试卷生成后暂存于服务端，支付后锁定
- BR-006: 教师端预览不展示答案、解析、分值、难度、知识点

---

### SRS-003 试卷预览

**Priority**: P0 (Must-have)

展示已生成试卷的第一页题目（约前5题），供教师确认组卷质量后决定是否支付。

**预览规则**:
- 仅展示首页题目内容与选项
- 不展示答案、解析、分值、难度、知识点
- 超出首页范围的题目以"支付后查看完整试卷"提示截断

**Business Rules**:
- BR-007: 预览仅展示首页题目，不暴露任何元数据
- BR-008: 导出时携带完整题目、答案（独立分页）、分值

---

### SRS-004 微信支付

**Priority**: P0 (Must-have)

按次付费，单次组卷单价由后台配置。调用微信支付统一下单接口完成支付。

**支付流程**:
1. 用户点击"支付并导出"
2. 后端生成订单 → 调用微信支付统一下单
3. 返回支付参数至小程序 → 唤起微信支付
4. 用户完成支付 → 微信回调通知后端
5. 后端更新订单状态 → 解锁导出功能

**Business Rules**:
- BR-009: 下单后30分钟内未支付，订单自动取消
- BR-010: 支付回调需验证签名

---

### SRS-005 导出试卷

**Priority**: P0 (Must-have)

支付成功后支持导出DOCX和PDF两种格式。

**格式要求**:

| 项目 | DOCX | PDF |
|------|------|-----|
| 页面 | A4 | A4 |
| 页眉 | 试卷标题 | 试卷标题 |
| 页脚 | 页码 | 页码 |
| 答案 | 独立分页 | 独立分页 |
| 字体 | 宋体正文 / 黑体标题 | 与DOCX一致 |

**Business Rules**:
- BR-011: 导出必须在15秒内完成
- BR-012: 生成的文件上传至COS，返回临时下载链接（有效期24小时）

---

### SRS-006 历史订单

**Priority**: P1 (Should-have)

教师查看历史组卷订单列表，支持按时间倒序排列、按科目筛选。已支付订单支持重复下载。

**Business Rules**:
- BR-013: 仅查看本人的订单
- BR-014: 已支付订单永久可下载；未支付订单仅保留1天

---

## 3.2 Admin Features (管理后台)

### SRS-101 文件上传

**Priority**: P0 (Must-have)

管理员上传题库资料文件，并指定资料的年级和学科。系统自动判断文件类型并路由至对应解析流程。

**上传表单字段**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 文件 | File | 是 | 支持格式见下表 |
| 年级 | Enum | 是 | 小学1-6 / 初中7-9 / 高中10-12 |
| 科目 | Enum | 是 | 九科选择 |

**支持格式**:

| 类别 | 格式 | 处理方式 |
|------|------|---------|
| 文本类 | DOC, DOCX, MD, PDF(文字版) | 直接文本提取 |
| 图片类 | PNG, JPG, JPEG | OCR → 文本提取 |

**PDF处理规则**:
- 文字版PDF: 直接提取文字层
- 扫描版PDF: 转换为图片后执行OCR

**Business Rules**:
- BR-101: 文件大小限制: 文本类 ≤ 50MB，图片类 ≤ 10MB
- BR-102: 上传后异步处理，前端展示处理进度
- BR-103: 管理员上传时必须指定年级和科目，作为后续知识点识别的范围约束

---

### SRS-102 OCR识别

**Priority**: P0 (Must-have)

对图片类文件和扫描版PDF执行OCR文字识别。

**处理流程**:
```
图片输入 → PaddleOCR引擎 → 文本提取 → 题目切分 → 结构化输出
```

**Business Rules**:
- BR-104: OCR处理时间 ≤ 60秒/文件
- BR-105: OCR识别成功率目标 ≥ 90%

---

### SRS-103 AI题目解析

**Priority**: P0 (Must-have)

对OCR或文本提取后的内容进行AI结构化解析，识别题目、答案、解析。

**Output（单题）**:
```json
{
  "rawText": "原文片段",
  "questionType": "single_choice",
  "content": "题目正文",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "answer": "A",
  "analysis": "解析内容"
}
```

**Business Rules**:
- BR-106: AI解析后进入待审核状态，不可直接入库

---

### SRS-104 AI知识点识别

**Priority**: P0 (Must-have)

学科和年级由管理员上传时指定（参见SRS-101），AI在此约束范围内识别具体知识点。

**知识点处理**:
1. 对题目内容生成Embedding向量
2. 在指定学科/年级范围内的知识点库中做语义相似度检索
3. 匹配成功(相似度 ≥ 阈值) → 直接关联
4. 匹配失败 → 自动创建新知识点，自动归入管理员指定的学科/年级分类下

**去重归并**:
- Embedding相似度 ≥ 阈值(如0.92)的不同知识点，自动归并为一个
- 避免"一次函数"/"线性函数"/"初等函数"等语义重复

**Business Rules**:
- BR-107: 管理员不可手动新增/删除/修改知识点
- BR-108: 知识点完全由AI自动维护；学科和年级以上传时管理员指定为准

---

### SRS-105 AI难度识别

**Priority**: P0 (Must-have)

系统自动判定题目难度等级。

| Level | 标签 | 参考标准 |
|-------|------|---------|
| 1 | 简单 | 基础概念、直接公式代入 |
| 2 | 中等 | 多步推理、知识点组合 |
| 3 | 困难 | 综合分析、创新解法 |

**Business Rules**:
- BR-109: 难度标签与题目一同进入待审核列表

---

### SRS-106 题库总览

**Priority**: P1 (Should-have)

管理后台首页仪表盘，展示题库统计：

- 总题目数
- 学科分布（饼图/柱状图）
- 年级分布
- 难度分布
- 知识点总数

---

### SRS-107 题目筛选

**Priority**: P1 (Should-have)

支持多维度筛选：学科、年级、知识点、难度、来源文件、关键词搜索。

**Business Rules**:
- BR-110: 筛选项之间为AND逻辑
- BR-111: 关键词搜索匹配题目正文和知识点名称

---

### SRS-108 题目删除

**Priority**: P1 (Should-have)

支持单题删除、批量删除（勾选）、按来源文件批量删除。

**Business Rules**:
- BR-112: 删除操作为软删除，标记 is_deleted = true
- BR-113: 已删除题目不再参与组卷检索

---

### SRS-109 知识点中心

**Priority**: P1 (Should-have)

只读展示知识点列表，每个知识点显示：名称、所属学科、所属年级、关联题目数量。

**Business Rules**:
- BR-114: 管理员仅可查看，不可编辑

---

### SRS-110 入库审核

**Priority**: P0 (Must-have)

AI解析完成后，题目进入"待审核"状态。管理员逐题或批量审核，通过后进入正式题库。

**审核操作**:
- 单题通过 / 单题拒绝
- 批量通过 / 批量拒绝（勾选）
- 全选 / 反选

**状态流转**:
```
PARSED(已解析) → ADMIN REVIEW → APPROVED(已通过) → 正式题库
                                → REJECTED(已拒绝) → 丢弃/重解析
```

**Business Rules**:
- BR-115: 仅 APPROVED 状态题目可被组卷检索
- BR-116: REJECTED 题目保留30天后自动清除

---

## 3.3 AI 知识库系统

### SRS-201 知识库检索

**Priority**: P0 (Must-have)

基于pgvector的语义相似度检索，支持按题目内容Embedding检索Top-N相似题目。

---

### SRS-202 知识点自动维护

**Priority**: P0 (Must-have)

知识点由AI全生命周期管理：识别 → 创建 → 归类 → 归并 → 关联。无人工操作入口。

**归并阈值**: Embedding余弦相似度 ≥ 0.92 视为同一知识点。

---

# 4. External Interface Requirements

## 4.1 User Interfaces

- 微信小程序界面，遵循微信小程序设计规范
- 教师端：简洁引导式操作流程
- 管理后台：效率型操作界面，支持批量操作

## 4.2 Hardware Interfaces

不适用。本系统为纯软件系统，无硬件接口。

## 4.3 Software Interfaces

| 外部系统 | 接口类型 | 用途 |
|---------|---------|------|
| 微信小程序SDK | JS API | 登录授权、支付 |
| 微信支付API | REST | 统一下单、支付回调 |
| Qwen3 API | REST | 大模型生成 |
| DeepSeek-V4 API | REST | 备用大模型 |
| PaddleOCR | REST/gRPC | OCR识别 |
| 腾讯云COS | SDK | 文件存储 |
| LibreOffice | CLI | PDF转换 |

## 4.4 Communication Interfaces

- 全站HTTPS
- JWT Bearer Token鉴权
- 支付回调使用HTTPS + 签名验证

---

# 5. Non-Functional Requirements

## 5.1 Performance

| 指标 | 目标值 |
|------|--------|
| AI组卷耗时 | ≤ 30秒 |
| OCR处理耗时 | ≤ 60秒 |
| 导出耗时 | ≤ 15秒 |
| 页面加载时间 | ≤ 2秒(首屏) |
| 接口响应时间 | ≤ 500ms(P95，不含AI生成接口) |

## 5.2 Availability

系统可用性 ≥ 99%（月度）。

## 5.3 Security

- 全站HTTPS传输
- JWT Token鉴权，24小时过期
- RBAC权限控制，角色-权限矩阵硬编码
- 微信支付签名验证
- 用户数据按OpenID隔离
- SQL注入防护（TypeORM参数化查询）
- XSS防护（输出编码）

## 5.4 Reliability

| 指标 | 目标值 |
|------|--------|
| AI组卷成功率 | ≥ 95% |
| OCR识别成功率 | ≥ 90% |
| 导出成功率 | ≥ 95% |
| 支付成功率 | ≥ 98% |

## 5.5 Maintainability

- 后端模块化设计，子系统职责分离
- 前端组件化开发
- 代码必须使用TypeScript

## 5.6 Data Retention

| 数据 | 保留策略 |
|------|---------|
| 用户数据 | 永久保留 |
| 已支付订单 | 永久保留 |
| 未支付订单 | 1天后清除 |
| 被拒绝题目 | 30天后自动清除 |
| 导出文件(COS) | 24小时后过期 |

---

# 6. Appendix

## 6.1 Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-29 | - | Initial draft based on PRD V1.0 |

## 6.2 Open Issues

- 组卷单价未在PRD中明确，需产品确认
- 知识点归并相似度阈值(0.92)为建议值，需验证后调整
- 教师端是否允许"仅预览不支付"的场景未明确
