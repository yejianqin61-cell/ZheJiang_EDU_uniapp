<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowDown, UserFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const navItems = computed(() => {
  const items = [
    { path: '/', label: '首页' },
    { path: '/paper/config', label: 'AI组卷' },
    { path: '/exercises', label: '同步练习' },
    { path: '/orders', label: '我的订单' },
  ]
  if (authStore.isLoggedIn) {
    items.push({ path: '/contribute', label: '我的贡献' })
  }
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
        <span class="logo-text">瓯越AI组题网</span>
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
          <!-- 个人中心入口 -->
          <router-link to="/profile" class="top-nav__profile" title="个人中心" aria-label="个人中心">
            <el-icon :size="20"><UserFilled /></el-icon>
          </router-link>
          <el-dropdown trigger="click">
            <span class="user-info">
              <span class="user-phone">{{ authStore.phoneMasked }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/profile')">👤 个人中心</el-dropdown-item>
                <el-dropdown-item @click="router.push('/exercises')">📚 同步练习</el-dropdown-item>
                <el-dropdown-item @click="router.push('/contribute')">📤 我的贡献</el-dropdown-item>
                <el-dropdown-item v-if="authStore.isAdmin" @click="router.push('/admin/dashboard')" divided>⚙️ 管理后台</el-dropdown-item>
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
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: $text-color;
  z-index: 1000;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
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
  color: $color-primary;
  font-size: $font-size-lg;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  font-family: $font-display;

  .logo-icon {
    font-size: 22px;
  }

  &:hover {
    opacity: 0.85;
  }
}

.top-nav__menu {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  flex: 1;
}

.top-nav__link {
  color: $text-color-secondary;
  padding: $spacing-sm $spacing-md;
  border-radius: $border-radius;
  font-size: $font-size-sm;
  text-decoration: none;
  transition: color 0.2s, background 0.2s;
  font-weight: 500;

  &:hover {
    color: $color-primary;
    background: rgba($color-primary, 0.06);
  }

  &--active {
    color: $color-primary;
    background: rgba($color-primary, 0.08);
  }
}

.top-nav__user {
  display: flex;
  align-items: center;
  gap: $spacing-sm;

  .user-info {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    cursor: pointer;
    padding: $spacing-sm $spacing-md;
    border-radius: $border-radius;
    color: $text-color-secondary;
    transition: background 0.2s;

    &:hover {
      background: rgba($color-primary, 0.06);
    }
  }
}

.top-nav__profile {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  text-decoration: none;
  transition: background 0.2s, transform 0.2s;

  &:hover {
    background: #337ecc;
    transform: scale(1.05);
  }
}
</style>
