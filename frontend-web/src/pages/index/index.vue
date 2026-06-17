<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

function startPaper() {
  if (authStore.isLoggedIn) {
    router.push('/paper/config')
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <div class="home-page">
    <!-- Hero 区 -->
    <section class="hero">
      <h1 class="hero__title">AI智能组卷</h1>
      <p class="hero__subtitle">
        面向浙江中小学教师 · 输入需求 → AI自动组卷 → 在线支付 → 导出试卷
      </p>
      <el-button type="primary" size="large" @click="startPaper">
        开始组卷
      </el-button>
    </section>

    <!-- 功能卡片 -->
    <section class="features">
      <div class="feature-card" @click="router.push('/paper/config')">
        <div class="feature-card__icon">📝</div>
        <h3>AI智能组卷</h3>
        <p>选择年级科目知识点，AI 秒级生成试卷</p>
      </div>
      <div class="feature-card" @click="router.push('/orders')">
        <div class="feature-card__icon">📦</div>
        <h3>我的订单</h3>
        <p>查看历史订单，重复下载试卷文件</p>
      </div>
      <div class="feature-card" @click="router.push('/contribute')">
        <div class="feature-card__icon">📤</div>
        <h3>教师贡献</h3>
        <p>上传题目资源，审核通过即返现</p>
      </div>
      <div class="feature-card" @click="router.push('/print/checkout')">
        <div class="feature-card__icon">🖨️</div>
        <h3>打印服务</h3>
        <p>在线下单，打印好快递到校</p>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.home-page {
  max-width: 900px;
  margin: 0 auto;
}

.hero {
  text-align: center;
  padding: 60px 0 48px;

  &__title {
    font-size: 42px;
    font-weight: 800;
    color: $color-primary;
    margin-bottom: $spacing-md;
  }

  &__subtitle {
    font-size: $font-size-lg;
    color: $text-color-secondary;
    margin-bottom: $spacing-xl;
    line-height: 1.8;
  }
}

.features {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-lg;
  margin-top: $spacing-xl;
}

.feature-card {
  background: $bg-color-white;
  border-radius: $border-radius-lg;
  padding: $spacing-xl $spacing-lg;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid $border-color;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    border-color: $color-primary-light;
  }

  &__icon {
    font-size: 40px;
    margin-bottom: $spacing-md;
  }

  h3 {
    font-size: $font-size-lg;
    margin-bottom: $spacing-sm;
    color: $text-color;
  }

  p {
    font-size: $font-size-sm;
    color: $text-color-secondary;
    line-height: 1.6;
  }
}

@media (max-width: 768px) {
  .features {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
