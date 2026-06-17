# 鉴权系统 — 全站评估与完善设计

Version 1.0 | 2026-06-17

---

## 一、现状评估

### 1.1 当前鉴权架构

```
登录
├── 生产: 手机号 + 短信验证码 → 后端查/建用户 → 签发 JWT(含 role)
├── 开发: code=admin_test → 后端直接创建 admin 用户 → 签发 JWT
└── JWT 存储: localStorage('accessToken')

前端路由守卫
├── 公开路由: /login (meta.public=true) → 放行
├── 未登录: → 重定向 /login?redirect=原路径
├── /admin/*:  解析 JWT role → 非 admin → 重定向 /
└── 其他路由: 有 token → 放行

前端 UI 鉴权
├── TopNav: authStore.isAdmin → 显示"管理后台"链接
├── AdminSidebar: 不检查角色（路由守卫兜底）
└── profile 页: authStore.isAdmin → 显示管理后台入口

后端 Guards
├── @Public(): 跳过 JWT 验证
├── JwtAuthGuard: 验证 JWT 有效性
├── @Roles('admin'): 仅 admin 可访问
└── @CurrentUser('id'): 从 JWT 提取用户 ID
```

### 1.2 逐项评估

| 检查项 | 状态 | 问题 |
|--------|------|------|
| 未登录不能访问受保护页 | ✅ | 路由守卫重定向 /login |
| 非 admin 不能访问 /admin/* | ✅ | 路由守卫 + 后端 @Roles('admin') |
| TopNav 根据角色显示 | ✅ | isAdmin 控制 |
| Sidebar 根据角色显示 | ❌ | Sidebar 不检查角色，但路由守卫兜底——非 admin 看不到 sidebar 因为进不了 /admin/* |
| profile 页管理员入口 | ⚠️ | profile/index.vue 用 auth.isAdmin 判断，但用的是硬编码 menus 而非 Store |
| 后端 API 权限 | ✅ | JwtAuthGuard 全局启用，@Roles 按需 |
| SMS 登录自动注册 | ✅ | 首次登录自动创建 teacher |
| 管理员识别 | ⚠️ | ADMIN_PHONES 在代码里但 SMS 登录没调用 |
| Token 过期处理 | ⚠️ | axios 拦截器 401 → 跳 /login，但无 refresh 机制 |
| Dev 登录 | ⚠️ | 只能创建 admin，无法模拟 teacher 测试 |
| 首页练习卡片权限 | ✅ | 所有用户可见，公开功能 |
| 教师贡献页权限 | ✅ | 所有已登录用户可用 |
| 打印服务权限 | ✅ | 所有已登录用户可用 |

---

## 二、发现的问题

### 2.1 严重（🔴）

| # | 问题 | 影响 |
|---|------|------|
| 1 | **SMS 登录不识别管理员** | `loginByPhone` 里没有检查 `ADMIN_PHONES`。用手机号登录永远是 teacher。 |
| 2 | **Dev 登录只能创建 admin** | 无法在浏览器测试 teacher 视角。 |
| 3 | **Token 过期无刷新** | 24 小时后突然跳登录页，体验差。 |

### 2.2 中等（🟡）

| # | 问题 | 影响 |
|---|------|------|
| 4 | **AdminSidebar 不区分角色** | 虽然路由守卫兜底，但代码不规范——万一布局复用就会暴露 |
| 5 | **profile 页硬编码菜单** | 管理员入口写死在 menus 数组，和 TopNav 的 isAdmin 判断不一致 |
| 6 | **公开展示的 API 无人校验** | `/v1/exercise/categories`、`/v1/pricing/public` 无鉴权（预期内），但 `/v1/orders` 等需要鉴权的端点应逐一确认 |

### 2.3 轻微（🟢）

| # | 问题 |
|---|------|
| 7 | 401 时直接 `window.location.href = '/login'`，应该用 `router.replace` |
| 8 | JWT 解析失败静默清除 token，不提示用户 |
| 9 | 无登录失败次数限制 |
| 10 | 无"记住我"功能 |

---

## 三、完善设计

### 3.1 管理员自动识别（修复 P0-1）

```typescript
// auth.service.ts — loginByPhone
async loginByPhone(phone: string) {
    let user = await this.userRepo.findOne({ where: { phone } });
    if (!user) {
        const adminPhones = (process.env.ADMIN_PHONES ?? '').split(',').map(s => s.trim());
        const role = adminPhones.includes(phone) ? 'admin' : 'teacher';
        user = this.userRepo.create({ phone, phoneVerified: true, role });
        await this.userRepo.save(user);
    }
    // 签发 JWT
}
```

### 3.2 Dev 双角色登录（修复 P0-2）

```typescript
// 登录页加两个 Dev 按钮:
// 🔧 Dev: admin_test → role=admin
// 🔧 Dev: teacher_test → role=teacher

// 后端处理: dev 模式下 code 直接作为 openid，查 admin_openids 或 admin_phones 判断角色
```

### 3.3 Token 刷新（修复 P0-3）

```
方案: 双 Token 机制（简化版）

accessToken:  2 小时过期
refreshToken: 7 天过期，存 localStorage

axios 拦截器:
  401 → 用 refreshToken 调 POST /v1/auth/refresh → 拿新 accessToken → 重试原请求
  如果 refresh 也 401 → 跳登录页

后端:
  POST /v1/auth/login → 返回 { accessToken, refreshToken }
  POST /v1/auth/refresh → 验证 refreshToken → 返回新 accessToken
```

> 如果觉得双 Token 太复杂，可以先把 accessToken 过期时间设长（7 天），上线后再加 refresh。

### 3.4 Sidebar 按角色过滤（修复 P1-4）

```typescript
// AdminSidebar.vue — 保持现状即可
// 因为非 admin 根本进不了 /admin/* 路由组
// 但为了规范，把 menuItems 改为 computed，加注释说明
```

### 3.5 登录页完善

```
┌──────────────────────────────────────────┐
│         🤖 AI智能组卷                    │
│                                          │
│  ┌─ 手机号登录 ──────────────────────┐   │
│  │  手机号  [_______________]        │   │
│  │  验证码  [___] [获取验证码]       │   │
│  │  ┌────── 登录 / 注册 ────────┐   │   │
│  │  └────────────────────────────┘   │   │
│  └────────────────────────────────────┘   │
│                                          │
│     首次登录自动注册 · 管理员由后台指定    │
│                                          │
│  ─────── Dev 快捷入口（开发环境）───────  │
│  [🔧 管理员登录]  [🔧 教师登录]          │
└──────────────────────────────────────────┘
```

---

## 四、角色权限矩阵（最终态）

### 4.1 页面级

| 路由 | teacher | admin | 未登录 |
|------|:-------:|:-----:|:------:|
| `/login` | ✅ | ✅ | ✅ |
| `/` (首页) | ✅ | ✅ | ✅ |
| `/paper/config` | ✅ | ✅ | ❌ |
| `/paper/preview` | ✅ | ✅ | ❌ |
| `/payment` | ✅ | ✅ | ❌ |
| `/orders` | ✅ | ✅ | ❌ |
| `/orders/:id` | ✅* | ✅ | ❌ |
| `/profile` | ✅ | ✅ | ❌ |
| `/profile/balance` | ✅ | ✅ | ❌ |
| `/profile/withdraw` | ✅ | ✅ | ❌ |
| `/contribute` | ✅ | ✅ | ❌ |
| `/contribute/upload` | ✅ | ✅ | ❌ |
| `/print/checkout` | ✅ | ✅ | ❌ |
| `/address` | ✅ | ✅ | ❌ |
| `/exercises` | ✅ | ✅ | ❌ |
| `/exercises/category` | ✅ | ✅ | ❌ |
| `/exercises/draw` | ✅ | ✅ | ❌ |
| `/admin/*` | ❌ | ✅ | ❌ |

> \* teacher 只能看自己的订单，admin 可看所有人的

### 4.2 API 级

| 端点组 | teacher | admin | 公开 |
|--------|:-------:|:-----:|:----:|
| `/auth/*` | ✅ | ✅ | ✅ |
| `/users/me` | ✅ | ✅ | ❌ |
| `/papers/*` | ✅ | ✅ | ❌ |
| `/orders/*` | ✅* | ✅ | ❌ |
| `/pricing/public` | ✅ | ✅ | ✅ |
| `/admin/*` | ❌ | ✅ | ❌ |
| `/exercise/categories` | ✅ | ✅ | ✅ |
| `/exercise/.../draw` | ✅ | ✅ | ❌ |
| `/contributions` | ✅* | ✅ | ❌ |
| `/shipping-addresses` | ✅* | ✅ | ❌ |

> \* 只能操作自己的数据

---

## 五、实施计划

| Phase | 内容 | 工时 | 优先级 |
|-------|------|------|--------|
| Phase 1 | 修复 ADMIN_PHONES 管理员识别 | 10min | 🔴 P0 |
| Phase 2 | Dev 双角色登录（admin_test / teacher_test） | 15min | 🔴 P0 |
| Phase 3 | 登录页 UI 完善（双 Dev 按钮 + 角色标识） | 20min | 🟡 P1 |
| Phase 4 | Token 刷新机制（可选） | 1h | 🟡 P1 |
| Phase 5 | 全站鉴权回归测试 | 30min | 🟡 P1 |
| **合计** | | **2h** | |

---

> **结论**：鉴权骨架是好的（JWT + RBAC + 路由守卫），但有 2 个 P0 bug（管理员识别+Dev 测试）和 Token 刷新缺失。修复只需 2 小时，不改架构。
