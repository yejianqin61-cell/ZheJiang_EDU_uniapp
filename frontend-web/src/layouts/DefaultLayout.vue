<script setup lang="ts">
</script>

<template>
  <div class="default-layout">
    <TopNav />
    <main class="container" style="margin-top: 56px; padding-top: 24px; padding-bottom: 24px;">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <footer class="footer">
      <div class="container">
        <p>© 2026 瓯越AI组题网 | 浙江中小学教师专属组题平台</p>
      </div>
    </footer>
  </div>
</template>

<script lang="ts">
import TopNav from '@/components/TopNav.vue'
export default { components: { TopNav } }
</script>

<style scoped lang="scss">
.default-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.footer {
  margin-top: auto;
  padding: $spacing-lg 0;
  text-align: center;
  font-size: $font-size-xs;
  color: $text-color-secondary;
  border-top: 1px solid $border-color;
  background: $bg-color-white;
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
