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
    <!-- 标题 -->
    <div class="home-title">
      <h1>瓯越AI组题网</h1>
    </div>

    <!-- 功能卡片 -->
    <section class="features">
      <div class="feature-card" @click="router.push('/exercises')">
        <div class="feature-card__icon">📚</div>
        <h3>AI题库</h3>
        <p>同步练 · 单元练 · 专题练 · 期中期末 — 海量试卷AI抽取</p>
        <span class="feature-card__action">开始练习 →</span>
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
      <div class="feature-card" @click="router.push('/paper/config')">
        <div class="feature-card__icon">📝</div>
        <h3>AI智能组卷</h3>
        <p>选择年级科目知识点，AI 秒级生成试卷，支持下载打印</p>
        <span class="feature-card__action">开始组卷 →</span>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.home-page {
  max-width: 1500px;
}

.home-title {
  text-align: center;
  padding-top: 80px;

  h1 {
    font-family: $font-display;
    font-size: 64px;
    font-weight: 900;
    color: $color-primary;
    letter-spacing: 0.06em;
  }
}

.features {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-xl;
  padding-top: 50px;
}

.feature-card {
  background: $bg-color-white;
  border-radius: $border-radius-lg;
  padding: $spacing-xl $spacing-lg;
  text-align: center;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  border: 1px solid $border-color;

  &:hover {
    transform: translateY(-2px) scale(1.01);
    box-shadow: $box-shadow-hover;
    border-color: $color-primary-light;
  }

  &:active {
    transform: scale(0.98);
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

  &__action {
    display: inline-block;
    margin-top: $spacing-sm;
    color: $color-primary;
    font-size: $font-size-base;
    font-weight: 600;
  }
}

@media (max-width: 1200px) {
  .features { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .features { grid-template-columns: 1fr; }
}
</style>
