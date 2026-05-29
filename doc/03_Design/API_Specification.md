# API Specification — AI智能组卷小程序

Version 1.0 | 2026-05-29

---

# 1. General

## 1.1 Base URL

```
Production:  https://api.example.com/v1
Development: http://localhost:3000/v1
```

## 1.2 Authentication

All endpoints except `POST /auth/login` require:

```
Authorization: Bearer <jwt_token>
```

## 1.3 Unified Response Envelope

```json
{
  "code": 0,
  "message": "ok",
  "data": { },
  "timestamp": 1717000000000
}
```

## 1.4 Pagination

```json
// Request
GET /resource?page=1&pageSize=20

// Response data
{
  "list": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

---

# 2. Auth Module — 认证

## 2.1 微信登录

```
POST /auth/login
```

**Request:**
```json
{
  "code": "wx_login_code_from_wx.login()"
}
```

**Response:**
```json
{
  "code": 0,
  "data": {
    "accessToken": "eyJhbG...",
    "user": {
      "id": "uuid",
      "role": "teacher",
      "nickname": "张老师",
      "avatarUrl": "https://..."
    }
  }
}
```

**Errors:** `10001` code无效, `10002` 微信接口调用失败

---

## 2.2 刷新Token

```
POST /auth/refresh
```

**Request (Header):** `Authorization: Bearer <expiring_token>`

**Response:** 新的 `accessToken`，有效期刷新为24小时

---

# 3. Paper Module — 组卷

## 3.1 获取组卷配置选项

```
GET /papers/config-options
```

**Response:**
```json
{
  "code": 0,
  "data": {
    "grades": [
      { "stage": "小学", "grades": ["一年级","二年级","三年级","四年级","五年级","六年级"] },
      { "stage": "初中", "grades": ["七年级","八年级","九年级"] },
      { "stage": "高中", "grades": ["高一","高二","高三"] }
    ],
    "subjects": ["语文","数学","英语","物理","化学","生物","政治","历史","地理"],
    "difficulties": [
      { "value": 1, "label": "简单" },
      { "value": 2, "label": "中等" },
      { "value": 3, "label": "困难" },
      { "value": "mixed", "label": "混合" }
    ]
  }
}
```

---

## 3.2 获取知识点列表

```
GET /papers/knowledge-points?subject=数学&grade=五年级
```

**Response:**
```json
{
  "code": 0,
  "data": [
    { "id": "uuid", "name": "分数加减法", "questionCount": 42 },
    { "id": "uuid", "name": "小数乘除法", "questionCount": 35 }
  ]
}
```

---

## 3.3 生成试卷

```
POST /papers/generate
Roles: teacher, admin
```

**Request:**
```json
{
  "subject": "数学",
  "grade": "五年级",
  "knowledgePointIds": ["uuid1", "uuid2"],
  "difficulty": "mixed",
  "questionCount": 20
}
```

**Response:**
```json
{
  "code": 0,
  "data": {
    "paperId": "uuid",
    "title": "五年级数学综合练习卷",
    "questions": [
      {
        "index": 1,
        "type": "single_choice",
        "content": "下列分数中最大的是（ ）",
        "options": ["A. 1/2", "B. 2/3", "C. 3/4", "D. 5/6"]
      }
    ],
    "generateTime": 25.8
  }
}
```

**Constraints:**
- 教师端返回仅含 `index`, `type`, `content`, `options`
- 后端存储完整题目（含答案/解析/难度/知识点/分值）
- 生成超时30秒返回 `20001` 错误，前端提示重试

**Errors:** `20001` 生成超时, `20002` 题库题目不足, `20003` LLM调用失败

---

## 3.4 重新生成试卷

```
POST /papers/{paperId}/regenerate
Roles: teacher, admin
```

每日每用户限3次。复用原条件，生成新试卷。旧 `draft` 试卷标记删除。

**Errors:** `20004` 超过每日重试次数

---

# 4. Payment Module — 支付

## 4.1 创建订单并发起支付

```
POST /orders
Roles: teacher, admin
```

**Request:**
```json
{
  "paperId": "uuid"
}
```

**Response:**
```json
{
  "code": 0,
  "data": {
    "orderId": "uuid",
    "orderNo": "20260529123456789012",
    "amount": 500,
    "wxPayParams": {
      "timeStamp": "1717000000",
      "nonceStr": "abc...",
      "package": "prepay_id=wx...",
      "signType": "RSA",
      "paySign": "sign..."
    }
  }
}
```

**Errors:** `30001` 试卷不存在, `30002` 已有未支付订单, `30003` 微信支付下单失败

---

## 4.2 支付回调 (Webhook)

```
POST /orders/callback
Public (签名验证，非JWT)
```

**Request:** 微信支付回调XML/JSON（签名验证后处理）

**Logic:**
1. 验签 → 2. 更新payment.status = success → 3. 更新order.status = paid → 4. 更新paper.status = paid

---

## 4.3 查询支付状态

```
GET /orders/{orderId}/payment-status
Roles: teacher, admin
```

```json
{
  "code": 0,
  "data": {
    "orderId": "uuid",
    "status": "paid",
    "paidAt": "2026-05-29T12:00:00Z"
  }
}
```

---

# 5. Export Module — 导出

## 5.1 导出DOCX

```
POST /papers/{paperId}/export/docx
Roles: teacher, admin
```

**Precondition:** order.status = paid

**Response:**
```json
{
  "code": 0,
  "data": {
    "downloadUrl": "https://cos.example.com/exports/xxx.docx?sign=...",
    "expiresAt": "2026-05-30T12:00:00Z"
  }
}
```

**Errors:** `40001` 未支付, `40002` 导出服务异常

---

## 5.2 导出PDF

```
POST /papers/{paperId}/export/pdf
Roles: teacher, admin
```

Response format same as DOCX.

---

# 6. Order Module — 订单

## 6.1 历史订单列表

```
GET /orders?page=1&pageSize=20&subject=数学&status=paid
Roles: teacher, admin
```

**Response:**
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "orderId": "uuid",
        "orderNo": "20260529123456789012",
        "paperTitle": "五年级数学综合练习卷",
        "amount": 500,
        "status": "paid",
        "createdAt": "2026-05-29T10:00:00Z"
      }
    ],
    "pagination": { "page": 1, "pageSize": 20, "total": 5, "totalPages": 1 }
  }
}
```

---

## 6.2 重新下载

```
GET /orders/{orderId}/download
Roles: teacher, admin
```

返回 COS 临时下载链接（同导出返回格式）。

---

# 7. Admin: Upload Module — 文件上传

## 7.1 上传文件

```
POST /admin/files/upload
Roles: admin
Content-Type: multipart/form-data
```

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | 文件本体 |
| subject | String | Yes | 学科 |
| grade | String | Yes | 年级 |

**Response:**
```json
{
  "code": 0,
  "data": {
    "fileId": "uuid",
    "filename": "五年级数学题库.docx",
    "status": "uploading"
  }
}
```

文件上传成功后，系统自动触发: OCR(如需) → AI切题 → AI解析 → 知识点识别 → 难度识别 → 写入待审核

---

## 7.2 查询上传文件列表

```
GET /admin/files?page=1&pageSize=20&status=completed
Roles: admin
```

---

## 7.3 查询文件处理状态

```
GET /admin/files/{fileId}
Roles: admin
```

```json
{
  "code": 0,
  "data": {
    "fileId": "uuid",
    "filename": "五年级数学题库.docx",
    "status": "processing",
    "stage": "ai_parsing",
    "progress": 60,
    "questionCount": 0
  }
}
```

**status values:** `uploading` → `processing` → `completed` / `failed`

---

# 8. Admin: Review Module — 入库审核

## 8.1 待审核题目列表

```
GET /admin/reviews?page=1&pageSize=20&fileId=uuid
Roles: admin
```

**Response:**
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "questionId": "uuid",
        "type": "single_choice",
        "content": "题目正文",
        "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
        "answer": "A",
        "analysis": "解析内容",
        "difficulty": 2,
        "knowledgePoints": [
          { "id": "uuid", "name": "分数加减法", "confidence": 0.96 }
        ],
        "sourceFile": { "id": "uuid", "filename": "xxx.docx" }
      }
    ],
    "pagination": { ... }
  }
}
```

---

## 8.2 审核操作

```
POST /admin/reviews/batch
Roles: admin
```

**Request:**
```json
{
  "questionIds": ["uuid1", "uuid2", "uuid3"],
  "action": "approve"
}
```

`action`: `approve` / `reject`

**Response:**
```json
{
  "code": 0,
  "data": {
    "approved": 2,
    "rejected": 0,
    "failed": 1,
    "failedIds": ["uuid3"],
    "failedReason": "题目已不存在"
  }
}
```

---

# 9. Admin: Question Bank Module — 题库管理

## 9.1 题库总览统计

```
GET /admin/questions/stats
Roles: admin
```

```json
{
  "code": 0,
  "data": {
    "totalQuestions": 15230,
    "bySubject": [
      { "subject": "数学", "count": 4520 },
      { "subject": "语文", "count": 3810 }
    ],
    "byGrade": [
      { "grade": "五年级", "count": 2100 }
    ],
    "byDifficulty": [
      { "level": 1, "label": "简单", "count": 5200 },
      { "level": 2, "label": "中等", "count": 6800 },
      { "level": 3, "label": "困难", "count": 3230 }
    ],
    "totalKnowledgePoints": 860
  }
}
```

---

## 9.2 题目列表

```
GET /admin/questions?page=1&pageSize=20&subject=数学&grade=五年级&difficulty=2&keyword=分数&fileId=uuid
Roles: admin
```

筛选参数均为可选，AND逻辑组合。

---

## 9.3 题目详情

```
GET /admin/questions/{questionId}
Roles: admin
```

返回完整题目信息（含answer, analysis, difficulty, knowledgePoints, sourceFile）。

---

## 9.4 删除题目

```
DELETE /admin/questions/{questionId}
Roles: admin
```

软删除: `is_deleted = true`

---

## 9.5 批量删除

```
POST /admin/questions/batch-delete
Roles: admin
```

```json
{ "questionIds": ["uuid1", "uuid2"] }
```

---

## 9.6 按文件删除

```
POST /admin/questions/delete-by-file
Roles: admin
```

```json
{ "fileId": "uuid" }
```

---

# 10. Admin: Knowledge Point Module — 知识点中心

## 10.1 知识点列表

```
GET /admin/knowledge-points?page=1&pageSize=50&subject=数学&grade=五年级&keyword=分数
Roles: admin
```

**Response:**
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": "uuid",
        "name": "分数加减法",
        "subject": "数学",
        "grade": "五年级",
        "questionCount": 42,
        "createdAt": "2026-05-01T00:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

只读接口。无C/U/D端点——知识点完全由AI自动维护。

---

# 11. User Module — 用户

## 11.1 获取个人信息

```
GET /users/me
Roles: teacher, admin
```

---

## 11.2 获取组卷统计

```
GET /users/me/stats
Roles: teacher, admin
```

```json
{
  "code": 0,
  "data": {
    "totalPapers": 12,
    "totalPaid": 8,
    "todayRegenerates": 1
  }
}
```

---

# 12. Error Code Reference

| Code | HTTP | Message |
|------|------|---------|
| 0 | 200 | ok |
| 10001 | 400 | 登录code无效 |
| 10002 | 502 | 微信接口调用失败 |
| 10003 | 401 | Token无效或已过期 |
| 10004 | 403 | 无权限访问 |
| 20001 | 500 | 组卷超时，请重试 |
| 20002 | 400 | 题库题目数量不足，请调整条件 |
| 20003 | 502 | AI服务暂不可用，请稍后重试 |
| 20004 | 429 | 超过每日重新生成次数限制 |
| 30001 | 404 | 试卷不存在 |
| 30002 | 409 | 该试卷已有未支付订单 |
| 30003 | 502 | 微信支付下单失败 |
| 40001 | 402 | 请先完成支付 |
| 40002 | 500 | 导出服务异常，请稍后重试 |
| 50001 | 404 | 订单不存在 |
| 60001 | 400 | 不支持的文件格式 |
| 60002 | 413 | 文件大小超出限制 |
| 60003 | 500 | OCR处理失败 |
| 70001 | 404 | 题目不存在 |
| 70002 | 409 | 题目已被审核，不可重复操作 |
| 80001 | 404 | 知识点不存在 |

---

# 13. Rate Limiting

| Endpoint Group | Limit |
|---------------|-------|
| /auth/* | 10 req/min per IP |
| /papers/generate | 10 req/min per user |
| /papers/*/regenerate | 3 req/day per user |
| /orders | 20 req/min per user |
| /admin/files/upload | 30 req/min per user |
| /admin/* | 60 req/min per user (admin only) |
