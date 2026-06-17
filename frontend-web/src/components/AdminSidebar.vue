<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const menuItems = [
  { path: '/admin/dashboard',    icon: 'DataAnalysis',  label: '仪表盘' },
  { path: '/admin/upload',       icon: 'Upload',         label: '文件上传' },
  { path: '/admin/review',       icon: 'Checked',        label: '入库审核' },
  { path: '/admin/questions',    icon: 'Collection',     label: '题库管理' },
  { path: '/admin/knowledge',    icon: 'PriceTag',       label: '知识点中心' },
  { path: '/admin/pricing',      icon: 'Money',          label: '定价配置' },
  { path: '/admin/orders',       icon: 'Document',       label: '订单管理' },
  { path: '/admin/withdrawals',  icon: 'Wallet',         label: '提现管理' },
]

function isActive(path: string): string | undefined {
  if (route.path === path) return path
  if (route.path.startsWith(path + '/')) return path
  return undefined
}
</script>

<template>
  <aside class="admin-sidebar">
    <el-menu
      :default-active="isActive(route.path) || ''"
      router
      :collapse="false"
      background-color="#ffffff"
      text-color="#606266"
      active-text-color="#1a6fb5"
    >
      <el-menu-item
        v-for="item in menuItems"
        :key="item.path"
        :index="item.path"
      >
        <el-icon><component :is="item.icon" /></el-icon>
        <span>{{ item.label }}</span>
      </el-menu-item>
    </el-menu>
  </aside>
</template>

<style scoped lang="scss">
.admin-sidebar {
  width: $sidebar-width;
  background: $bg-color-white;
  border-right: 1px solid $border-color;
  flex-shrink: 0;
  overflow-y: auto;
  padding: $spacing-sm 0;

  .el-menu {
    border-right: none;
  }
}
</style>
