# 邮箱密码登录 — 设计文档

**版本**: 1.0 | **日期**: 2026-06-18 | **状态**: 待确认

---

## 一、方案概述

新增邮箱+密码登录方式，手机号验证码登录保留兼容。

### 注册流程

```
输入邮箱 → 点击"发送验证码" → 邮箱收到6位验证码
→ 输入验证码 + 密码 + 确认密码
→ 点击"注册" → 后端验证 → 创建用户 → 返回JWT → 自动登录
```

### 登录流程

```
输入邮箱 + 密码 → 点击"登录" → 后端校验 → 返回JWT
```

### 忘记密码

```
输入邮箱 → 点击"发送验证码" → 输入验证码 + 新密码 → 重置密码
```

---

## 二、数据库变更

**`user` 表新增字段**：

```sql
ALTER TABLE "user" ADD COLUMN email VARCHAR(128);
ALTER TABLE "user" ADD COLUMN password_hash VARCHAR(256);
ALTER TABLE "user" ADD COLUMN email_verified BOOLEAN DEFAULT 0;
```

不强制唯一——手机号仍然是主标识，邮箱作为附加登录方式。

---

## 三、后端设计

### 3.1 Deps

```bash
npm install nodemailer bcrypt
```

### 3.2 配置（`.env`）

```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=your@qq.com
SMTP_PASS=qq授权码
```

### 3.3 邮件服务 `EmailService`

```
sendCode(email) → 生成6位数字验证码 → 存Redis(5分钟过期) → 发送邮件
verifyCode(email, code) → Redis对比校验
```

邮件模板：
```
主题：瓯越AI组题网 - 邮箱验证码

您的验证码是：482917
有效期 5 分钟。如非本人操作请忽略。
```

### 3.4 新增 API

| 方法 | 路径 | Body | 说明 |
|------|------|------|------|
| POST | `/auth/send-email-code` | `{email}` | 发送邮箱验证码 |
| POST | `/auth/register` | `{email, code, password}` | 注册（验证码+密码） |
| POST | `/auth/login-by-password` | `{email, password}` | 密码登录 |
| POST | `/auth/reset-password` | `{email, code, newPassword}` | 重置密码 |

### 3.5 注册逻辑

```
1. 校验 email 格式 + code 正确 + password 长度>=6
2. 查 user 表是否有该 email
3. 已有 → 更新 password_hash → 返回JWT（绑定现有账号）
4. 没有 → 新建 user（新手机号占位 + email + password_hash）→ 返回JWT
```

### 3.6 登录逻辑

```
1. 查 user 表 email
2. 没有 → 报错"账号不存在"
3. bcrypt.compare(password, password_hash)
4. 不匹配 → 报错"密码错误"
5. 匹配 → 生成JWT返回
```

---

## 四、前端设计

### 4.1 登录页改造

```
┌─────────────────────────────────┐
│  🤖 瓯越AI组题网                   │
│  中小学教师专属组题平台              │
├─────────────────────────────────┤
│  [邮箱登录]  [手机号登录]           │  ← Tab 切换
│                                  │
│  ┌─ 邮箱登录 ─────────────────┐  │
│  │  邮箱：[________________]  │  │
│  │  密码：[________________]  │  │
│  │                           │  │
│  │  [登录]                    │  │
│  │                           │  │
│  │  ─── 没有账号？ ───        │  │
│  │  邮箱：[________________]  │  │
│  │  验证码：[______] [发送]   │  │
│  │  密码：[________________]  │  │
│  │  确认密码：[____________]  │  │
│  │  [注册]                    │  │
│  └───────────────────────────┘  │
│                                  │
│  [忘记密码？]                      │
└─────────────────────────────────┘
```

### 4.2 默认 Tab

- 首次访问 → 邮箱登录 Tab（主推）
- 已用过手机号登录 → 记住上次选择

---

## 五、改动清单

| 文件 | 改动 |
|------|------|
| `user.entity.ts` | +email, +password_hash, +email_verified |
| `auth.service.ts` | +registerByEmail, +loginByPassword, +resetPassword |
| `auth.controller.ts` | +4 个新端点 |
| `email.service.ts` | 新建 — 发邮件验证码 |
| `auth.module.ts` | 注册 EmailService |
| `login/index.vue` | 重构 — Tab + 邮箱登录/注册表单 |
| `.env.production` | +SMTP 配置 |
| `package.json` | +nodemailer, +bcrypt |

**共 8 个文件，预估 3h。**

---

## 六、与现有手机号登录的关系

- 手机号验证码登录 **保留**（已有用户不受影响）
- 管理员 `ADMIN_PHONES` 规则 **照旧**（该手机号自动获得 admin 角色）
- Dev 快捷登录 **保留**（`admin_test` / `teacher_test`）
- 邮箱注册的用户的手机号为空，不影响正常使用（订单通知等场景可后续补充）
