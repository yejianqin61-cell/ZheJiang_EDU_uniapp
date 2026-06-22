<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { renderMarkdown } from '@/composables/useMarkdown'
import { getPublicPricing } from '@/api/modules/pricing'
import { usePaperStore } from '@/stores/paper'
import type { PricingConfig } from '@/types'

const router = useRouter()
const paper = usePaperStore()
const pricing = ref<PricingConfig | null>(null)

const PREVIEW_LIMIT = 5
const previewQuestions = computed(() => paper.currentPaper?.questions.slice(0, PREVIEW_LIMIT) ?? [])
const totalQuestions = computed(() => paper.currentPaper?.questions.length ?? 0)

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

onMounted(async () => {
  if (!paper.currentPaper) {
    router.replace('/paper/config')
    return
  }

  try {
    pricing.value = await getPublicPricing()
  }
  catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '价格信息加载失败'))
  }
})

function calcDownloadPrice(): string {
  if (!pricing.value) {
    return '—'
  }

  const unitPrice = pricing.value.download.unitPrice
  return `¥${(unitPrice / 100).toFixed(2)}/题 × ${totalQuestions.value}题 = ¥${((unitPrice * totalQuestions.value) / 100).toFixed(2)}`
}

function calcPrintRange(): string {
  if (!pricing.value || !pricing.value.print.length) {
    return '—'
  }

  const tiers = pricing.value.print
  return `¥${(tiers[0].unitPrice / 100).toFixed(2)}~${(tiers[tiers.length - 1].unitPrice / 100).toFixed(2)}/份`
}

function goDownloadPay() {
  router.push(`/payment?paperId=${paper.currentPaper!.paperId}&type=download`)
}

function goPrintCheckout() {
  router.push(`/print/checkout?paperId=${paper.currentPaper!.paperId}`)
}
</script>

<template>
  <div v-if="paper.currentPaper" class="preview-page">
    <div class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="breadcrumb__separator">›</span>
      <router-link to="/paper/config">AI组卷</router-link>
      <span class="breadcrumb__separator">›</span>
      <span class="breadcrumb__current">试卷预览</span>
    </div>

    <div class="paper-header page-card">
      <h1>{{ paper.currentPaper.title }}</h1>
      <p class="paper-meta">共 {{ totalQuestions }} 题 | 生成耗时 {{ paper.currentPaper.generateTime }}s</p>
    </div>

    <div class="question-list">
      <div v-for="question in previewQuestions" :key="question.index" class="question-card page-card">
        <div class="q-header">
          <span class="q-index">{{ question.index }}.</span>
          <el-tag size="small">{{ question.type }}</el-tag>
        </div>
        <p class="q-content" v-html="renderMarkdown(question.content)"></p>
        <div v-if="question.options?.length" class="q-options">
          <div v-for="(option, index) in question.options" :key="index" class="q-option">{{ option }}</div>
        </div>
      </div>
    </div>

    <div v-if="totalQuestions > PREVIEW_LIMIT" class="blocker page-card">
      <p>前 {{ PREVIEW_LIMIT }} 题免费预览，支付后查看完整试卷（剩余 {{ totalQuestions - PREVIEW_LIMIT }} 题）</p>
    </div>

    <div class="diversion">
      <div class="service-card page-card" @click="goDownloadPay">
        <div class="service-inner">
          <span class="service-icon">📥</span>
          <div class="service-body">
            <h3>下载试卷</h3>
            <p>支付后下载 DOCX / PDF，自行打印</p>
            <span class="service-price">{{ calcDownloadPrice() }}</span>
          </div>
          <span class="service-arrow">›</span>
        </div>
      </div>
      <div class="service-card page-card" @click="goPrintCheckout">
        <div class="service-inner">
          <span class="service-icon">🖨️</span>
          <div class="service-body">
            <h3>打印并快递</h3>
            <p>在线支付，我们打印好快递上门</p>
            <span class="service-price">{{ calcPrintRange() }}</span>
          </div>
          <span class="service-arrow">›</span>
        </div>
      </div>
    </div>

    <div class="regenerate">
      <el-button @click="router.push('/paper/config')">重新组卷</el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.preview-page {
  max-width: 1500px;
}

.paper-header {
  h1 {
    margin-bottom: $spacing-sm;
    font-size: $font-size-xxl;
  }

  .paper-meta {
    font-size: $font-size-sm;
    color: $text-color-secondary;
  }
}

.question-card {
  margin-bottom: $spacing-md;

  .q-header {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    margin-bottom: $spacing-md;
  }

  .q-index {
    font-size: $font-size-lg;
    font-weight: 700;
  }

  .q-content {
    font-size: $font-size-base;
    line-height: 1.8;
    white-space: pre-wrap;
  }

  .q-options {
    margin-top: $spacing-md;
  }

  .q-option {
    padding: 4px 0;
    font-size: $font-size-base;
    color: $text-color-secondary;
  }
}

.blocker {
  margin-bottom: $spacing-lg;
  color: $color-danger;
  text-align: center;
}

.diversion {
  display: flex;
  flex-direction: row;
  gap: $spacing-lg;
  margin-bottom: $spacing-lg;

  .service-card {
    flex: 1;
  }
}

.service-card {
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;

  &:hover {
    background: #fef9f0;
    border-color: $color-primary-light;
  }

  .service-inner {
    display: flex;
    align-items: center;
    gap: $spacing-md;
  }

  .service-icon {
    flex-shrink: 0;
    font-size: 36px;
  }

  .service-body {
    flex: 1;

    h3 {
      margin-bottom: 4px;
      font-size: $font-size-lg;
    }

    p {
      font-size: $font-size-sm;
      color: $text-color-secondary;
    }
  }

  .service-price {
    font-weight: 500;
    color: $color-danger;
  }

  .service-arrow {
    flex-shrink: 0;
    font-size: 24px;
    color: $color-primary;
  }
}

.regenerate {
  padding: $spacing-lg 0;
  text-align: center;
}

@media (max-width: 768px) {
  .diversion {
    flex-direction: column;
  }
}
</style>
