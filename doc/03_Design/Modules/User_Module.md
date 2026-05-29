# User Module — 用户模块

Version 1.0 | 2026-05-29

---

## 模块职责

负责用户身份认证与个人信息管理。微信授权登录 → JWT签发 → 角色判定 → 个人信息查询。

---

## 功能列表

| ID | 功能 | 描述 |
|----|------|------|
| U-01 | 微信授权登录 | 调用wx.login获取code，后端换取OpenID，签发JWT |
| U-02 | 自动注册 | 首次登录自动创建用户记录，默认角色teacher |
| U-03 | Token刷新 | JWT过期前续期，刷新后有效期重置为24小时 |
| U-04 | 个人信息查询 | 获取当前用户昵称、头像、角色 |
| U-05 | 组卷统计查询 | 查询当前用户累计组卷次数、已支付次数、当日重生成剩余次数 |
| U-06 | 管理员角色设定 | 由运维在数据库层面手动将指定用户role改为admin |

---

## 前端页面

| 页面 | 路由 | 描述 |
|------|------|------|
| 登录页 | `/pages/login/index` | 微信授权一键登录，无表单 |
| 个人中心 | `/pages/profile/index` | 头像、昵称、角色标签、使用统计 |

---

## 后端服务

| 服务 | 职责 |
|------|------|
| `AuthService` | 微信code换OpenID、JWT签发与验证、Token刷新 |
| `UserService` | 用户查询与创建、个人信息读取、统计数据聚合 |

---

## 数据表

| 表 | 用途 |
|---|------|
| `user` | 用户主表（id, openid, role, nickname, avatar_url） |

---

## API

| Method | Endpoint | Auth | 描述 |
|--------|----------|------|------|
| POST | `/v1/auth/login` | Public | 微信登录，返回accessToken |
| POST | `/v1/auth/refresh` | JWT | 刷新Token |
| GET | `/v1/users/me` | JWT | 获取个人信息 |
| GET | `/v1/users/me/stats` | JWT | 获取个人组卷统计 |

### POST /v1/auth/login

```
Request:  { "code": "wx_login_code" }
Response: { "accessToken": "...", "user": { "id", "role", "nickname", "avatarUrl" } }
```

### GET /v1/users/me/stats

```
Response: { "totalPapers": 12, "totalPaid": 8, "todayRegenerates": 1 }
```

---

## 状态流转

```
微信授权
    │
    ▼
┌─────────┐    code无效    ┌──────────┐
│ code验证 │──────────────►│ 10001错误 │
└────┬────┘               └──────────┘
     │ code有效
     ▼
┌─────────────┐
│ 查询OpenID   │
└────┬────────┘
     │
  ┌──┴──────────┐
  ▼             ▼
已存在         首次
  │             │
  ▼             ▼
读取用户      创建用户
记录          (role=teacher)
  │             │
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │ 签发JWT      │  ← 有效期24h
  └──────┬──────┘
         ▼
    返回Token + 用户信息
```
