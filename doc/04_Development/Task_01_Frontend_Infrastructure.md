# Task 01 — 前端基础设施搭建

**关联文档**：[Web_Migration_Blueprint.md](../03_Design/Web_Migration_Blueprint.md)  
**预估工时**：2 天  
**优先级**：P0（阻塞所有前端页面开发）

---

## 目标

从零搭建 `frontend-web/` 项目骨架：Vite + Vue3 + Element Plus + Vue Router + Pinia + axios + SCSS。完成路由守卫、API 层、登录注册流程、布局组件。**本阶段结束时，可以登录、看到顶部导航、跳转空白页面。**

---

## 1. 项目初始化 (0.5h)

- [ ] `npm create vite@latest frontend-web -- --template vue-ts`
- [ ] `cd frontend-web && npm install`
- [ ] 安装核心依赖：

```bash
npm install vue-router@4 pinia axios element-plus echarts mitt sass
npm install -D @types/node sass-embedded
```

- [ ] 配置 `vite.config.ts`：
  - 路径别名 `@/` → `src/`
  - SCSS 全局变量注入 `additionalData: '@use "@/styles/variables.scss" as *;'`
  - Dev server proxy：`/v1` → `http://localhost:3000`
- [ ] 配置 `tsconfig.json` 路径别名

---

## 2. 样式体系 (1h)

### 2.1 文件清单

- [ ] `src/styles/variables.scss` — CSS 变量 + SCSS 变量

```scss
// 主色调
$color-primary: #1a6fb5;
$color-primary-light: #4a90d9;
$color-success: #67c23a;
$color-warning: #e6a23c;
$color-danger: #f56c6c;

// 布局
$page-max-width: 1200px;
$top-nav-height: 56px;
$sidebar-width: 220px;

// 字体
$font-size-xs: 12px;
$font-size-sm: 13px;
$font-size-base: 14px;
$font-size-lg: 16px;
$font-size-xl: 20px;

// 圆角
$border-radius: 6px;
```

- [ ] `src/styles/reset.scss` — CSS Reset
- [ ] `src/styles/global.scss` — 全局样式（body 背景、容器类、通用工具类）
- [ ] 在 `main.ts` 中引入 Element Plus + 全局样式

### 2.2 Element Plus 按需引入（可选）

- [ ] 决定全局引入还是按需引入
- [ ] 如果按需：`npm install -D unplugin-vue-components unplugin-auto-import`
- [ ] 配置 Element Plus 主题色覆盖 `$color-primary`

---

## 3. Vue Router (1.5h)

### 3.1 路由配置

- [ ] `src/router/index.ts` — 完整路由表

```typescript
const routes = [
  // 公开路由
  { path: '/login', component: () => import('@/pages/login/index.vue'), meta: { public: true, layout: 'blank' } },

  // 教师端 (DefaultLayout)
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      { path: '',              component: () => import('@/pages/index/index.vue'),                meta: { title: '首页' } },
      { path: 'paper/config',  component: () => import('@/pages/paper/config/index.vue'),         meta: { title: 'AI组卷' } },
      { path: 'paper/preview', component: () => import('@/pages/paper/preview/index.vue'),        meta: { title: '试卷预览' } },
      { path: 'payment',       component: () => import('@/pages/payment/index.vue'),              meta: { title: '确认支付' } },
      { path: 'orders',        component: () => import('@/pages/orders/index.vue'),               meta: { title: '我的订单' } },
      { path: 'orders/:id',    component: () => import('@/pages/orders/detail/index.vue'),        meta: { title: '订单详情' } },
      { path: 'profile',       component: () => import('@/pages/profile/index.vue'),              meta: { title: '个人中心' } },
      { path: 'profile/balance',  component: () => import('@/pages/profile/balance/index.vue'),   meta: { title: '余额' } },
      { path: 'profile/withdraw', component: () => import('@/pages/profile/withdraw/index.vue'),  meta: { title: '提现' } },
      { path: 'contribute',    component: () => import('@/pages/contribute/index.vue'),           meta: { title: '我的贡献' } },
      { path: 'contribute/upload',   component: () => import('@/pages/contribute/upload/index.vue'),  meta: { title: '上传题目' } },
      { path: 'contribute/preview',  component: () => import('@/pages/contribute/preview/index.vue'), meta: { title: '题目预览' } },
      { path: 'contribute/:id',component: () => import('@/pages/contribute/detail/index.vue'),    meta: { title: '贡献详情' } },
      { path: 'print/checkout', component: () => import('@/pages/print/checkout/index.vue'),      meta: { title: '打印服务' } },
      { path: 'address',       component: () => import('@/pages/address/list/index.vue'),         meta: { title: '收货地址' } },
      { path: 'address/edit/:id?', component: () => import('@/pages/address/edit/index.vue'),     meta: { title: '编辑地址' } },
    ]
  },

  // 管理后台 (AdminLayout)
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { role: 'admin' },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard',   component: () => import('@/pages/admin/dashboard/index.vue'),   meta: { title: '仪表盘' } },
      { path: 'upload',      component: () => import('@/pages/admin/upload/index.vue'),      meta: { title: '文件上传' } },
      { path: 'review',      component: () => import('@/pages/admin/review/index.vue'),      meta: { title: '入库审核' } },
      { path: 'review/:id',  component: () => import('@/pages/admin/review/detail/index.vue'), meta: { title: '审核详情' } },
      { path: 'questions',   component: () => import('@/pages/admin/questions/index.vue'),   meta: { title: '题库管理' } },
      { path: 'questions/:id', component: () => import('@/pages/admin/questions/detail/index.vue'), meta: { title: '题目详情' } },
      { path: 'knowledge',   component: () => import('@/pages/admin/knowledge/index.vue'),   meta: { title: '知识点中心' } },
      { path: 'pricing',     component: () => import('@/pages/admin/pricing/index.vue'),     meta: { title: '定价配置' } },
      { path: 'orders',      component: () => import('@/pages/admin/orders/index.vue'),      meta: { title: '订单管理' } },
      { path: 'withdrawals', component: () => import('@/pages/admin/withdrawals/index.vue'), meta: { title: '提现管理' } },
    ]
  },

  // 404
  { path: '/:pathMatch(.*)*', redirect: '/' },
];
```

### 3.2 路由守卫

- [ ] `router.beforeEach` 实现：

```typescript
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('accessToken');

  // 公开路由放行
  if (to.meta.public) return next();

  // 未登录 → 跳转登录页
  if (!token) return next({ path: '/login', query: { redirect: to.fullPath } });

  // 管理后台权限校验
  if (to.path.startsWith('/admin')) {
    const role = getRoleFromToken(token);  // 解析 JWT payload.role
    if (role !== 'admin') return next('/');
  }

  next();
});
```

---

## 4. API 层 (1h)

### 4.1 axios 实例

- [ ] `src/api/index.ts`

```typescript
import axios from 'axios';
import { ElMessage } from 'element-plus';

const api = axios.create({
  baseURL: '/v1',
  timeout: 30000,
});

// 请求拦截器：注入 Token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 响应拦截器：统一错误处理
api.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      return Promise.reject(err);
    }
    const msg = err.response?.data?.message || '网络错误';
    ElMessage.error(msg);
    return Promise.reject(err);
  }
);

export default api;
```

### 4.2 API 模块拆分

- [ ] `src/api/modules/auth.ts` — `sendSms(phone)` / `login(phone, smsCode)` / `getProfile()`
- [ ] `src/api/modules/paper.ts` — `getConfig()` / `generatePaper(params)` / `getPaper(id)`
- [ ] `src/api/modules/order.ts` — `createOrder(params)` / `getOrders(params)` / `getOrder(id)`
- [ ] `src/api/modules/payment.ts` — `pay(orderId)` / `checkPayStatus(orderId)`
- [ ] `src/api/modules/admin.ts` — 管理后台全部 API

> **原则**：API 函数签名参考旧的 `frontend/src/api/index.ts`，只改底层从 `uni.request` 换成 `axios`。

---

## 5. 状态管理 (0.5h)

- [ ] `src/stores/auth.ts` — Pinia

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { sendSms, login } from '@/api/modules/auth';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('accessToken') || '');
  const user = ref<User | null>(null);
  const isLoggedIn = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  async function sendSmsCode(phone: string) {
    await sendSms(phone);
  }

  async function loginWithSms(phone: string, smsCode: string) {
    const res = await login(phone, smsCode);
    token.value = res.accessToken;
    localStorage.setItem('accessToken', res.accessToken);
    user.value = { phone, role: res.role };
  }

  function logout() {
    token.value = '';
    user.value = null;
    localStorage.removeItem('accessToken');
    window.location.href = '/login';
  }

  return { token, user, isLoggedIn, isAdmin, sendSmsCode, loginWithSms, logout };
});
```

- [ ] `src/stores/paper.ts` — 组卷状态（参考旧项目迁移）
- [ ] `src/stores/order.ts` — 订单状态（参考旧项目迁移）

---

## 6. 布局组件 (1.5h)

### 6.1 TopNav.vue

- [ ] 顶部固定导航栏
- [ ] Logo 左 + 导航菜单中 + 用户下拉右
- [ ] 教师端菜单：首页 | AI组卷 | 我的订单 | 个人中心
- [ ] 管理员端菜单（`isAdmin` 时显示）：+ 管理后台 ▾（下拉）
- [ ] 未登录：显示「登录」按钮
- [ ] 已登录：显示用户头像 + 手机号后四位 + 下拉（个人中心/退出登录）
- [ ] 当前路由高亮 (`router-link-active`)

### 6.2 DefaultLayout.vue

```
<TopNav />
<main class="container">
  <router-view />
</main>
<Footer />
```

### 6.3 AdminLayout.vue

```
<TopNav />
<div class="admin-layout">
  <AdminSidebar />
  <main class="admin-content">
    <router-view />
  </main>
</div>
```

### 6.4 AdminSidebar.vue

- [ ] 侧边栏菜单（`el-menu` + `router-link`）
- [ ] 菜单项：仪表盘 · 文件上传 · 入库审核 · 题库管理 · 知识点中心 · 定价配置 · 订单管理 · 提现管理
- [ ] 当前路由高亮

---

## 7. 登录页 (1.5h)

### 7.1 页面结构

```
┌──────────────────────────────────────────┐
│                                          │
│         🤖 AI智能组卷                    │
│         中小学教师专属组卷平台             │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  手机号  [________________]        │  │
│  │                                    │  │
│  │  验证码  [_____] [获取验证码]      │  │
│  │                                    │  │
│  │  ┌────── 登录 / 注册 ──────────┐  │  │
│  │  └──────────────────────────────┘  │  │
│  └────────────────────────────────────┘  │
│                                          │
│    首次登录将自动注册账号                 │
│                                          │
└──────────────────────────────────────────┘
```

### 7.2 功能实现

- [ ] 手机号输入框（`el-input` + 手机号格式校验）
- [ ] 验证码输入框 + 获取验证码按钮（60 秒倒计时）
- [ ] 登录按钮（`el-button` + loading 状态）
- [ ] 调用 `authStore.sendSmsCode()` → `authStore.loginWithSms()`
- [ ] 成功后 `router.push(redirect || '/')`
- [ ] 错误提示（`ElMessage.error`）

### 7.3 不需要注册页

- 首次登录自动注册，用户无感知
- 后端逻辑：`phone` 不存在 → `create user` → 签发 JWT

---

## 8. App.vue + main.ts (0.5h)

- [ ] `App.vue`：`<router-view />`（布局由路由 meta.layout 决定）
- [ ] `main.ts`：`createApp` → `use(router)` → `use(pinia)` → `use(ElementPlus)` → `mount('#app')`

---

## 9. 类型定义 (0.5h)

- [ ] `src/types/index.ts` — 从旧项目拷贝 `frontend/src/types/index.ts`
- [ ] 新增 Web 专用类型：
  - `LoginRequest { phone: string; smsCode: string }`
  - `LoginResponse { accessToken: string; role: 'teacher' | 'admin' }`
  - `SmsRequest { phone: string }`

---

## 验收标准

- [ ] `npm run dev` → 浏览器打开，看到登录页
- [ ] 输入手机号 + 验证码 → 登录成功 → 跳转首页（空白占位）
- [ ] 顶部导航栏显示，菜单可点击
- [ ] 管理后台侧边栏显示，路由跳转正常
- [ ] 未登录访问 `/admin/dashboard` → 重定向到 `/login`
- [ ] 刷新页面后 Token 不丢失
- [ ] 退出登录后重定向到 `/login`
