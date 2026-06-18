import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  // ==================== 公开路由 ====================
  {
    path: '/login',
    component: () => import('@/pages/login/index.vue'),
    meta: { public: true, title: '登录' },
  },

  // ==================== 教师端 (DefaultLayout) ====================
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      { path: '',                  component: () => import('@/pages/index/index.vue'),                meta: { title: '首页' } },
      { path: 'paper/config',      component: () => import('@/pages/paper/config/index.vue'),         meta: { title: 'AI组卷' } },
      { path: 'paper/preview',     component: () => import('@/pages/paper/preview/index.vue'),        meta: { title: '试卷预览' } },
      { path: 'payment',           component: () => import('@/pages/payment/index.vue'),              meta: { title: '确认支付' } },
      { path: 'orders',            component: () => import('@/pages/orders/index.vue'),               meta: { title: '我的订单' } },
      { path: 'orders/:id',        component: () => import('@/pages/orders/detail/index.vue'),        meta: { title: '订单详情' } },
      { path: 'profile',           component: () => import('@/pages/profile/index.vue'),              meta: { title: '个人中心' } },
      { path: 'profile/balance',   component: () => import('@/pages/profile/balance/index.vue'),      meta: { title: '我的余额' } },
      { path: 'profile/withdraw',  component: () => import('@/pages/profile/withdraw/index.vue'),     meta: { title: '提现' } },
      { path: 'contribute',        component: () => import('@/pages/contribute/index.vue'),           meta: { title: '我的贡献' } },
      { path: 'contribute/upload', component: () => import('@/pages/contribute/upload/index.vue'),    meta: { title: '上传题目' } },
      { path: 'contribute/preview',component: () => import('@/pages/contribute/preview/index.vue'),   meta: { title: '题目预览' } },
      { path: 'contribute/:id',    component: () => import('@/pages/contribute/detail/index.vue'),    meta: { title: '贡献详情' } },
      { path: 'contribute/exercise-upload', component: () => import('@/pages/contribute/exercise-upload/index.vue'), meta: { title: '上传练习试卷' } },
      { path: 'contribute/exercise/:id', component: () => import('@/pages/contribute/exercise-detail/index.vue'), meta: { title: '练习详情' } },
      { path: 'print/checkout',    component: () => import('@/pages/print/checkout/index.vue'),       meta: { title: '打印服务' } },
      { path: 'address',           component: () => import('@/pages/address/list/index.vue'),         meta: { title: '收货地址' } },
      { path: 'address/edit/:id?', component: () => import('@/pages/address/edit/index.vue'),         meta: { title: '编辑地址' } },
      { path: 'exercises',         component: () => import('@/pages/exercises/index.vue'),              meta: { title: '练习' } },
      { path: 'exercises/category',component: () => import('@/pages/exercises/category.vue'),           meta: { title: '选择类目' } },
      { path: 'exercises/draw',    component: () => import('@/pages/exercises/draw.vue'),               meta: { title: '抽取试卷' } },
      { path: 'exercises/papers',  component: () => import('@/pages/exercises/papers/index.vue'),      meta: { title: '试卷列表' } },
      { path: 'exercises/papers/:id', component: () => import('@/pages/exercises/paper-detail/index.vue'), meta: { title: '试卷详情' } },
    ],
  },

  // ==================== 管理后台 (AdminLayout) ====================
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { role: 'admin' },
    children: [
      { path: '',                  redirect: '/admin/dashboard' },
      { path: 'dashboard',         component: () => import('@/pages/admin/dashboard/index.vue'),      meta: { title: '仪表盘' } },
      { path: 'upload',            component: () => import('@/pages/admin/upload/index.vue'),         meta: { title: '文件上传' } },
      { path: 'review',            component: () => import('@/pages/admin/review/index.vue'),         meta: { title: '入库审核' } },
      { path: 'review/:id',        component: () => import('@/pages/admin/review/detail/index.vue'),  meta: { title: '审核详情' } },
      { path: 'questions',         component: () => import('@/pages/admin/questions/index.vue'),      meta: { title: '题库管理' } },
      { path: 'questions/:id',     component: () => import('@/pages/admin/questions/detail/index.vue'),meta: { title: '题目详情' } },
      { path: 'knowledge',         component: () => import('@/pages/admin/knowledge/index.vue'),      meta: { title: '知识点中心' } },
      { path: 'pricing',           component: () => import('@/pages/admin/pricing/index.vue'),        meta: { title: '定价配置' } },
      { path: 'orders',            component: () => import('@/pages/admin/orders/index.vue'),         meta: { title: '订单管理' } },
      { path: 'withdrawals',       component: () => import('@/pages/admin/withdrawals/index.vue'),    meta: { title: '提现管理' } },
      { path: 'exercises',         component: () => import('@/pages/admin/exercises/index.vue'),      meta: { title: '练习管理' } },
      { path: 'exercise-contributions', component: () => import('@/pages/admin/exercise-contributions/index.vue'), meta: { title: '练习审核' } },
    ],
  },

  // 404
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// ==================== 路由守卫 ====================
router.beforeEach((to, _from, next) => {
  // 公开路由放行
  if (to.meta.public) return next()

  const token = localStorage.getItem('accessToken')

  // 未登录 → 跳转登录页
  if (!token) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }

  // 管理后台权限校验
  if (to.path.startsWith('/admin')) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.role !== 'admin') {
        return next('/')
      }
    } catch {
      localStorage.removeItem('accessToken')
      return next('/login')
    }
  }

  next()
})

export default router
