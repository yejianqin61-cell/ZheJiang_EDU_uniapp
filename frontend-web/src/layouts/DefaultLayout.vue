<script setup lang="ts">
</script>

<template>
  <div class="default-layout">
    <TopNav />
    <main class="container" style="margin-top: 56px; padding-top: 24px; padding-bottom: 24px;">
      <router-view />
    </main>
    <footer class="footer">
      <div class="container">
        <p>© 2026 AI智能组卷 | 浙江中小学教师专属组卷平台</p>
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
</style>
