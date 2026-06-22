# Issue: 鉴权资料返回类型与真实接口契约存在漂移

日期：2026-06-22

## 现象

- 前端 `frontend-web/src/api/modules/auth.ts` 中：
  - `UserProfile` 声明包含 `createdAt`
  - 但缺少后端实际返回的 `nickname`、`avatarUrl`
- 前端 `frontend-web/src/stores/auth.ts` 中：
  - Dev 登录通过 `(res as any).user` 读取角色，依赖弱类型兜底

## 实际契约

- 后端 `GET /users/me` 实际返回：
  - `id`
  - `role`
  - `nickname`
  - `avatarUrl`
  - `phone`
- 后端 `POST /auth/login` 在 Dev / 微信 code 登录链路下实际返回：
  - `accessToken`
  - `user: { id, role, nickname, avatarUrl }`

## 风险

- 前端类型误导后续维护，新增字段或重构时容易继续基于错误结构开发。
- `auth` store 的 Dev 登录流程依赖 `any`，测试无法有效约束真实返回形状。
- 鉴权链路是全站基础能力，契约漂移会放大到路由、顶部导航、个人中心等多个入口。

## 处理建议

1. 将 `UserProfile` 调整为和后端 `/users/me` 一致
2. 为 code / Dev 登录补齐显式返回类型，移除 store 中的 `as any`
3. 为 `auth` store 增加针对 `fetchProfile()`、`devLogin()` 的回归测试
