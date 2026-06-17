<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const navItems = computed(() => {
  const items = [
    { path: '/', label: '首页' },
    { path: '/paper/config', label: 'AI组卷' },
    { path: '/orders', label: '我的订单' },
  ]
  if (authStore.isAdmin) {
    items.push({ path: '/admin/dashboard', label: '管理后台' })
  }
  return items
})

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function goLogin() {
  router.push('/login')
}

function handleLogout() {
  authStore.logout()
}
</script>

<template>
  <header class="top-nav">
    <div class="top-nav__inner">
      <!-- Logo -->
      <router-link to="/" class="top-nav__logo">
        <span class="logo-icon">🤖</span>
        <span class="logo-text">AI智能组卷</span>
      </router-link>

      <!-- 导航菜单 -->
      <nav class="top-nav__menu">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="top-nav__link"
          :class="{ 'top-nav__link--active': isActive(item.path) }"
        >
          {{ item.label }}
        </router-link>
      </nav>

      <!-- 右侧用户区 -->
      <div class="top-nav__user">
        <template v-if="authStore.isLoggedIn">
          <el-dropdown trigger="click">
            <span class="user-info">
              <el-icon><UserFilled /></el-icon>
              <span class="user-phone">{{ authStore.phoneMasked }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/profile')">个人中心</el-dropdown-item>
                <el-dropdown-item @click="router.push('/profile/balance')">我的余额</el-dropdown-item>
                <el-dropdown-item @click="router.push('/contribute')">我的贡献</el-dropdown-item>
                <el-dropdown-item @click="router.push('/address')">收货地址</el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
        <template v-else>
          <el-button type="primary" size="small" @click="goLogin">登录</el-button>
        </template>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: $top-nav-height;
  background: linear-gradient(135deg, $color-primary, $color-primary-dark);
  color: #fff;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.top-nav__inner {
  max-width: $page-max-width;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 $spacing-lg;
  gap: $spacing-lg;
}

.top-nav__logo {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  color: #fff;
  font-size: $font-size-lg;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;

  .logo-icon {
    font-size: 24px;
  }

  &:hover {
    opacity: 0.9;
  }
}

.top-nav__menu {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  flex: 1;
}

.top-nav__link {
  color: rgba(255, 255, 255, 0.85);
  padding: $spacing-sm $spacing-md;
  border-radius: $border-radius;
  font-size: $font-size-base;
  text-decoration: none;
  transition: all 0.2s;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.15);
  }

  &--active {
    color: #fff;
    background: rgba(255, 255, 255, 0.2);
  }
}

.top-nav__user {
  display: flex;
  align-items: center;

  .user-info {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    cursor: pointer;
    padding: $spacing-sm $spacing-md;
    border-radius: $border-radius;
    color: rgba(255, 255, 255, 0.9);
    transition: background 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  }
}
</style>
