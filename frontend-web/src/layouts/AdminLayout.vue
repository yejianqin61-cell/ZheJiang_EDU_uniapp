<script setup lang="ts">
</script>

<template>
  <div class="admin-layout-wrapper">
    <TopNav />
    <div class="admin-layout" style="margin-top: 56px;">
      <AdminSidebar />
      <main class="admin-content">
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script lang="ts">
import TopNav from '@/components/TopNav.vue'
import AdminSidebar from '@/components/AdminSidebar.vue'
export default { components: { TopNav, AdminSidebar } }
</script>

<style scoped lang="scss">
.admin-layout-wrapper {
  min-height: 100vh;
  background: $bg-color;
}

.admin-layout {
  display: flex;
  min-height: calc(100vh - #{$top-nav-height});
}

.admin-content {
  flex: 1;
  padding: $spacing-lg;
  overflow-y: auto;
  min-width: 0;
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.page-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
