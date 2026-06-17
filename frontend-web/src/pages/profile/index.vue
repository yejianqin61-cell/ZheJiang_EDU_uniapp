<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/index'

const router = useRouter()
const auth = useAuthStore()
const stats = ref({ orderCount: 0, balance: 0, contributionCount: 0 })

onMounted(async () => {
  try { stats.value = await api.get('/users/me/stats') } catch {}
  try { const d = await api.get('/users/me/balance'); stats.value.balance = d?.balance ?? 0 } catch {}
})

const quickActions = [
  { label: 'AI组卷', icon: '📝', path: '/paper/config', color: '#e67e22' },
  { label: '我的订单', icon: '📦', path: '/orders', color: '#52c41a' },
  { label: '我的贡献', icon: '📤', path: '/contribute', color: '#fa8c16' },
  { label: '收货地址', icon: '📍', path: '/address', color: '#722ed1' },
]
const menuItems = [
  { label: '我的余额', icon: '💰', path: '/profile/balance', desc: `¥${(stats.value.balance / 100).toFixed(2)}` },
  { label: '提现', icon: '💳', path: '/profile/withdraw', desc: '提现到支付宝' },
]
if (auth.isAdmin) {
  menuItems.push({ label: '管理后台', icon: '⚙️', path: '/admin/dashboard', desc: '题库 · 审核 · 练习管理' })
}
</script>

<template>
  <div class="profile-page">
    <!-- 顶部：个人信息 + 统计 -->
    <div class="profile-hero">
      <div class="profile-hero__user">
        <div class="hero-avatar">👤</div>
        <div class="hero-info">
          <h2>{{ auth.phoneMasked || '未设置手机号' }}</h2>
          <el-tag :type="auth.isAdmin ? 'danger' : ''" size="small">{{ auth.isAdmin ? '管理员' : '教师' }}</el-tag>
        </div>
      </div>
      <div class="profile-hero__stats">
        <div class="hero-stat"><span class="hero-stat__num">{{ stats.orderCount || 0 }}</span><span class="hero-stat__label">历史订单</span></div>
        <div class="hero-stat"><span class="hero-stat__num">{{ stats.contributionCount || 0 }}</span><span class="hero-stat__label">贡献题目</span></div>
        <div class="hero-stat"><span class="hero-stat__num hero-stat__num--gold">¥{{ (stats.balance / 100).toFixed(0) }}</span><span class="hero-stat__label">账户余额</span></div>
      </div>
    </div>

    <!-- 主体：双栏 -->
    <div class="profile-body">
      <!-- 左栏：快捷操作 -->
      <div class="profile-left">
        <div class="section-title">快捷操作</div>
        <div class="quick-row">
          <div v-for="a in quickActions" :key="a.path" class="quick-card" @click="router.push(a.path)" :style="{ borderTopColor: a.color }">
            <span class="quick-icon">{{ a.icon }}</span>
            <span class="quick-label">{{ a.label }}</span>
          </div>
        </div>
      </div>

      <!-- 右栏：菜单 + 退出 -->
      <div class="profile-right">
        <div class="section-title">账户管理</div>
        <div class="menu-card">
          <div v-for="m in menuItems" :key="m.path" class="menu-row" @click="router.push(m.path)">
            <span class="menu-icon">{{ m.icon }}</span>
            <span class="menu-label">{{ m.label }}</span>
            <span class="menu-desc">{{ m.desc }}</span>
            <span class="menu-arrow">›</span>
          </div>
        </div>
        <div class="logout-wrap">
          <el-button type="danger" plain size="large" @click="auth.logout" style="width:100%">退出登录</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.profile-page{max-width:1500px}

// 顶部信息条
.profile-hero{
  display:flex; align-items:center; justify-content:space-between; gap:$spacing-xl;
  background: linear-gradient(135deg,$color-primary,$color-primary-dark);
  color:#fff; border-radius:$border-radius-lg; padding:$spacing-lg $spacing-xl; margin-bottom:$spacing-lg;

  &__user{ display:flex; align-items:center; gap:$spacing-lg; }
  &__stats{ display:flex; gap:$spacing-xl; }
}
.hero-avatar{font-size:48px;background:rgba(255,255,255,.15);width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.hero-info h2{font-size:$font-size-xl;margin-bottom:2px}
.hero-stat{text-align:center; &__num{display:block;font-size:22px;font-weight:700; &--gold{color:#ffe082}} &__label{font-size:$font-size-xs;opacity:.8}}

// 双栏主体
.profile-body{ display:flex; gap:$spacing-lg; align-items:flex-start; }
.profile-left{ flex:1; min-width:0; }
.profile-right{ width:340px; flex-shrink:0; }

.section-title{font-size:$font-size-base;font-weight:600;margin-bottom:$spacing-md;color:$text-color}
.quick-row{display:grid;grid-template-columns:repeat(2,1fr);gap:$spacing-md}
.quick-card{
  background:#fff;border-radius:$border-radius;padding:$spacing-xl $spacing-md;text-align:center;
  cursor:pointer;border-top:3px solid $color-primary;box-shadow:$box-shadow-light;transition:all .2s;
  &:hover{transform:translateY(-2px);box-shadow:$box-shadow}
  .quick-icon{display:block;font-size:32px;margin-bottom:$spacing-sm}
  .quick-label{font-size:$font-size-base;color:$text-color;font-weight:500}
}
.menu-card{background:#fff;border-radius:$border-radius;overflow:hidden;box-shadow:$box-shadow-light;margin-bottom:$spacing-md}
.menu-row{display:flex;align-items:center;padding:14px $spacing-md;cursor:pointer;border-bottom:1px solid #f5f5f5;transition:background .2s;&:last-child{border-bottom:none}&:hover{background:#fafafa}.menu-icon{font-size:20px;margin-right:$spacing-md}.menu-label{font-weight:500;flex:1}.menu-desc{font-size:$font-size-xs;color:$text-color-secondary;margin-right:$spacing-sm}.menu-arrow{color:$text-color-placeholder;font-size:18px}}
.logout-wrap{padding-top:$spacing-sm}

@media (max-width: 768px) {
  .profile-hero{flex-direction:column;text-align:center;&__stats{width:100%;justify-content:space-around}}
  .profile-body{flex-direction:column}.profile-right{width:100%}
  .quick-row{grid-template-columns:repeat(2,1fr)}
}
</style>
