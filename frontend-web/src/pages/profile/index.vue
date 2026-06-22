<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getMyBalance, getUserStats } from '@/api/modules/auth'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const stats = ref({
  totalPapers: 0,
  totalPaid: 0,
  balance: 0,
})

onMounted(async () => {
  try {
    const data = await getUserStats()
    stats.value.totalPapers = data.totalPapers ?? 0
    stats.value.totalPaid = data.totalPaid ?? 0
  }
  catch {}

  try {
    const data = await getMyBalance()
    stats.value.balance = data?.balance ?? 0
  }
  catch {}
})

const quickActions = [
  { label: 'AI组卷', icon: '📝', path: '/paper/config', color: '#e67e22' },
  { label: '我的订单', icon: '📦', path: '/orders', color: '#52c41a' },
  { label: '我的贡献', icon: '📤', path: '/contribute', color: '#fa8c16' },
  { label: '收货地址', icon: '📍', path: '/address', color: '#722ed1' },
]

const menuItems = computed(() => {
  const items = [
    { label: '我的余额', icon: '💰', path: '/profile/balance', desc: `¥${(stats.value.balance / 100).toFixed(2)}` },
    { label: '提现', icon: '💳', path: '/profile/withdraw', desc: '提现到支付宝' },
  ]

  if (auth.isAdmin) {
    items.push({ label: '管理后台', icon: '⚙️', path: '/admin/dashboard', desc: '题库 · 审核 · 练习管理' })
  }

  return items
})
</script>

<template>
  <div class="profile-page">
    <div class="profile-hero">
      <div class="profile-hero__user">
        <div class="hero-avatar">👤</div>
        <div class="hero-info">
          <h2>{{ auth.phoneMasked || '未设置手机号' }}</h2>
          <el-tag :type="auth.isAdmin ? 'danger' : ''" size="small">{{ auth.isAdmin ? '管理员' : '教师' }}</el-tag>
        </div>
      </div>
      <div class="profile-hero__stats">
        <div class="hero-stat">
          <span class="hero-stat__num">{{ stats.totalPapers || 0 }}</span>
          <span class="hero-stat__label">已生成试卷</span>
        </div>
        <div class="hero-stat">
          <span class="hero-stat__num">{{ stats.totalPaid || 0 }}</span>
          <span class="hero-stat__label">已支付订单</span>
        </div>
        <div class="hero-stat">
          <span class="hero-stat__num hero-stat__num--gold">¥{{ (stats.balance / 100).toFixed(0) }}</span>
          <span class="hero-stat__label">账户余额</span>
        </div>
      </div>
    </div>

    <div class="profile-body">
      <div class="profile-left">
        <div class="section-title">快捷操作</div>
        <div class="quick-row">
          <div
            v-for="action in quickActions"
            :key="action.path"
            class="quick-card"
            :style="{ borderTopColor: action.color }"
            @click="router.push(action.path)"
          >
            <span class="quick-icon">{{ action.icon }}</span>
            <span class="quick-label">{{ action.label }}</span>
          </div>
        </div>
      </div>

      <div class="profile-right">
        <div class="section-title">账户管理</div>
        <div class="menu-card">
          <div v-for="item in menuItems" :key="item.path" class="menu-row" @click="router.push(item.path)">
            <span class="menu-icon">{{ item.icon }}</span>
            <span class="menu-label">{{ item.label }}</span>
            <span class="menu-desc">{{ item.desc }}</span>
            <span class="menu-arrow">›</span>
          </div>
        </div>
        <div class="logout-wrap">
          <el-button type="danger" plain size="large" class="logout-button" @click="auth.logout">退出登录</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.profile-page {
  max-width: 1500px;
}

.profile-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-xl;
  margin-bottom: $spacing-lg;
  padding: $spacing-lg $spacing-xl;
  color: #fff;
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  border-radius: $border-radius-lg;

  &__user {
    display: flex;
    align-items: center;
    gap: $spacing-lg;
  }

  &__stats {
    display: flex;
    gap: $spacing-xl;
  }
}

.hero-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  font-size: 48px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
}

.hero-info h2 {
  margin-bottom: 2px;
  font-size: $font-size-xl;
}

.hero-stat {
  text-align: center;

  &__num {
    display: block;
    font-size: 22px;
    font-weight: 700;

    &--gold {
      color: #ffe082;
    }
  }

  &__label {
    font-size: $font-size-xs;
    opacity: 0.8;
  }
}

.profile-body {
  display: flex;
  align-items: flex-start;
  gap: $spacing-lg;
}

.profile-left {
  flex: 1;
  min-width: 0;
}

.profile-right {
  width: 340px;
  flex-shrink: 0;
}

.section-title {
  margin-bottom: $spacing-md;
  font-size: $font-size-base;
  font-weight: 600;
  color: $text-color;
}

.quick-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-md;
}

.quick-card {
  padding: $spacing-xl $spacing-md;
  text-align: center;
  cursor: pointer;
  background: #fff;
  border-top: 3px solid $color-primary;
  border-radius: $border-radius;
  box-shadow: $box-shadow-light;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: $box-shadow;
  }

  .quick-icon {
    display: block;
    margin-bottom: $spacing-sm;
    font-size: 32px;
  }

  .quick-label {
    font-size: $font-size-base;
    font-weight: 500;
    color: $text-color;
  }
}

.menu-card {
  margin-bottom: $spacing-md;
  overflow: hidden;
  background: #fff;
  border-radius: $border-radius;
  box-shadow: $box-shadow-light;
}

.menu-row {
  display: flex;
  align-items: center;
  padding: 14px $spacing-md;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.2s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #fafafa;
  }
}

.menu-icon {
  margin-right: $spacing-md;
  font-size: 20px;
}

.menu-label {
  flex: 1;
  font-weight: 500;
}

.menu-desc {
  margin-right: $spacing-sm;
  font-size: $font-size-xs;
  color: $text-color-secondary;
}

.menu-arrow {
  font-size: 18px;
  color: $text-color-placeholder;
}

.logout-wrap {
  padding-top: $spacing-sm;
}

.logout-button {
  width: 100%;
}

@media (max-width: 768px) {
  .profile-hero {
    flex-direction: column;
    text-align: center;

    &__stats {
      width: 100%;
      justify-content: space-around;
    }
  }

  .profile-body {
    flex-direction: column;
  }

  .profile-right {
    width: 100%;
  }

  .quick-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
