<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePaperStore } from '@/stores/paper'
import { renderMarkdown } from '@/composables/useMarkdown'
import api from '@/api/index'
import type { PricingConfig } from '@/types'

const router = useRouter()
const paper = usePaperStore()
const pricing = ref<PricingConfig | null>(null)

const PREVIEW_LIMIT = 5
const previewQuestions = paper.currentPaper?.questions.slice(0, PREVIEW_LIMIT) ?? []
const totalQuestions = paper.currentPaper?.questions.length ?? 0

onMounted(async () => {
  if (!paper.currentPaper) { router.replace('/paper/config'); return }
  try { pricing.value = await api.get('/pricing/public') } catch { /* */ }
})

function calcDownloadPrice(): string {
  if (!pricing.value) return '—'
  const u = pricing.value.download.unitPrice
  return `¥${(u / 100).toFixed(2)}/题 × ${totalQuestions}题 = ¥${((u * totalQuestions) / 100).toFixed(2)}`
}
function calcPrintRange(): string {
  if (!pricing.value || !pricing.value.print.length) return '—'
  const ts = pricing.value.print
  return `¥${(ts[0].unitPrice / 100).toFixed(2)}~${(ts[ts.length-1].unitPrice / 100).toFixed(2)}/份`
}
function goDownloadPay() { router.push(`/payment?paperId=${paper.currentPaper!.paperId}&type=download`) }
function goPrintCheckout() { router.push(`/print/checkout?paperId=${paper.currentPaper!.paperId}`) }
</script>

<template>
  <div class="preview-page" v-if="paper.currentPaper">
    <div class="breadcrumb">
      <router-link to="/">首页</router-link> <span class="breadcrumb__separator">›</span>
      <router-link to="/paper/config">AI组卷</router-link> <span class="breadcrumb__separator">›</span>
      <span class="breadcrumb__current">试卷预览</span>
    </div>

    <div class="paper-header page-card">
      <h1>{{ paper.currentPaper.title }}</h1>
      <p class="paper-meta">共 {{ totalQuestions }} 题 | 生成耗时 {{ paper.currentPaper.generateTime }}s</p>
    </div>

    <div class="question-list">
      <div v-for="q in previewQuestions" :key="q.index" class="question-card page-card">
        <div class="q-header"><span class="q-index">{{ q.index }}.</span><el-tag size="small">{{ q.type }}</el-tag></div>
        <p class="q-content" v-html="renderMarkdown(q.content)"></p>
        <div v-if="q.options?.length" class="q-options">
          <div v-for="(o,i) in q.options" :key="i" class="q-option">{{ o }}</div>
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
          <div class="service-body"><h3>下载试卷</h3><p>支付后下载 DOCX / PDF，自行打印</p><span class="service-price">{{ calcDownloadPrice() }}</span></div>
          <span class="service-arrow">›</span>
        </div>
      </div>
      <div class="service-card page-card" @click="goPrintCheckout">
        <div class="service-inner">
          <span class="service-icon">🖨️</span>
          <div class="service-body"><h3>打印并快递</h3><p>在线支付，我们打印好快递上门</p><span class="service-price">{{ calcPrintRange() }}</span></div>
          <span class="service-arrow">›</span>
        </div>
      </div>
    </div>

    <div class="regenerate"><el-button @click="router.push('/paper/config')">重新组卷</el-button></div>
  </div>
</template>

<style scoped lang="scss">
.preview-page { max-width: 1500px; }
.paper-header { h1 { font-size: $font-size-xxl; margin-bottom: $spacing-sm; } .paper-meta { font-size: $font-size-sm; color: $text-color-secondary; } }
.question-card { margin-bottom: $spacing-md; .q-header { display: flex; align-items: center; gap: $spacing-sm; margin-bottom: $spacing-md; } .q-index { font-weight: 700; font-size: $font-size-lg; } .q-content { font-size: $font-size-base; line-height: 1.8; white-space: pre-wrap; } .q-options { margin-top: $spacing-md; } .q-option { padding: 4px 0; font-size: $font-size-base; color: $text-color-secondary; } }
.blocker { text-align: center; color: $color-danger; margin-bottom: $spacing-lg; }
.diversion { display: flex; flex-direction: row; gap: $spacing-lg; margin-bottom: $spacing-lg; .service-card { flex: 1; } }
.service-card { cursor: pointer; border: 2px solid transparent; transition: all 0.2s; &:hover { border-color: $color-primary-light; background: #fef9f0; } .service-inner { display: flex; align-items: center; gap: $spacing-md; } .service-icon { font-size: 36px; flex-shrink: 0; } .service-body { flex: 1; h3 { font-size: $font-size-lg; margin-bottom: 4px; } p { font-size: $font-size-sm; color: $text-color-secondary; } } .service-price { color: $color-danger; font-weight: 500; } .service-arrow { font-size: 24px; color: $color-primary; flex-shrink: 0; } }
.regenerate { text-align: center; padding: $spacing-lg 0; }
@media (max-width: 768px) {
  .diversion { flex-direction: column; }
}
</style>
