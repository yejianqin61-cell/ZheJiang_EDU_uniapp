<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { drawCategory, drawLesson } from '@/api/modules/exercise'
import type { ExercisePaper } from '@/types'

type DrawNodeType = 'category' | 'lesson'

interface DrawErrorResponseData {
  message?: string
}

interface DrawErrorLike {
  response?: {
    status?: number
    data?: DrawErrorResponseData
  }
}

const route = useRoute()
const router = useRouter()
const nodeType = ((route.query.nodeType as string) || 'category') as DrawNodeType
const nodeId = (route.query.nodeId as string) || ''
const drawing = ref(true)
const paper = ref<ExercisePaper | null>(null)
const error = ref('')

onMounted(async () => {
  try {
    if (!nodeId) {
      error.value = '抽题信息缺失，请返回上一步重新选择'
      return
    }

    paper.value = nodeType === 'lesson'
      ? await drawLesson(nodeId)
      : await drawCategory(nodeId)
  }
  catch (caughtError: unknown) {
    error.value = resolveDrawErrorMessage(caughtError)
  }
  finally {
    setTimeout(() => {
      drawing.value = false
    }, 1500)
  }
})

function getDrawErrorLike(error: unknown): DrawErrorLike | null {
  return typeof error === 'object' && error !== null ? error as DrawErrorLike : null
}

function resolveDrawErrorMessage(error: unknown) {
  const drawError = getDrawErrorLike(error)
  const status = drawError?.response?.status
  const message = String(drawError?.response?.data?.message || '').trim()

  if (status === 404 || message.includes('暂无试卷')) {
    return '暂无试卷，请联系管理员上传'
  }

  if (!drawError?.response) {
    return '抽题失败，请检查网络后重试'
  }

  return message || '抽题服务异常，请稍后重试'
}

function goDownload() {
  if (!paper.value) {
    return
  }

  router.push(`/payment?paperId=${paper.value.id}&type=exercise`)
}

function goPrint() {
  if (!paper.value) {
    return
  }

  router.push(`/print/checkout?paperId=${paper.value.id}`)
}
</script>

<template>
  <div class="draw-page">
    <div class="breadcrumb"><router-link to="/">首页</router-link><span class="breadcrumb__separator">›</span><span class="breadcrumb__current">试卷抽取</span></div>

    <div v-if="drawing" class="drawing-overlay">
      <div class="drawing-spinner"><div class="spinner"></div></div>
      <p class="drawing-text">AI正在从题库中为你抽取试题</p>
    </div>

    <div v-else-if="error" class="page-card text-center" style="padding:60px">
      <p class="text-secondary">{{ error }}</p>
      <el-button class="mt-md" @click="router.back()">返回</el-button>
    </div>

    <div v-else-if="paper" class="draw-result">
      <div class="draw-left">
        <div class="thumbnail-wrap">
          <img v-if="paper.thumbnailUrl" :src="paper.thumbnailUrl" alt="试卷缩略图" />
          <div v-else class="thumbnail-placeholder">
            <span class="placeholder-icon">📄</span>
            <span>{{ paper.fileType?.toUpperCase() }} 文件</span>
            <span class="text-secondary" style="font-size:12px">缩略图暂无</span>
          </div>
        </div>
      </div>

      <div class="draw-right">
        <div class="page-card paper-result">
          <h2>📄 {{ paper.title }}</h2>
          <p class="text-secondary mt-sm">{{ paper.fileType?.toUpperCase() }} 文件{{ paper.fileSize ? ' · ' + (paper.fileSize / 1024).toFixed(0) + 'KB' : '' }}{{ paper.pageCount ? ' · ' + paper.pageCount + '页' : '' }}</p>
        </div>

        <div class="diversion mt-md">
          <div class="service-card page-card" @click="goDownload">
            <div class="service-inner">
              <span class="service-icon">📥</span>
              <div class="service-body"><h3>下载服务</h3><p>支付后下载原始文件，自行打印</p></div>
              <span class="service-arrow">›</span>
            </div>
          </div>
          <div class="service-card page-card" @click="goPrint">
            <div class="service-inner">
              <span class="service-icon">🖨️</span>
              <div class="service-body"><h3>打印服务</h3><p>在线支付，我们打印好快递上门</p></div>
              <span class="service-arrow">›</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.draw-page { max-width: 1500px; }
.draw-result { display: flex; gap: $spacing-lg; align-items: flex-start; }
.draw-left { width: 420px; flex-shrink: 0; }
.draw-right { flex: 1; min-width: 0; }
.thumbnail-wrap {
  background: #fff;
  border-radius: $border-radius;
  padding: $spacing-md;
  box-shadow: $box-shadow-light;

  img {
    width: 100%;
    display: block;
    border-radius: 4px;
  }
}
.drawing-overlay { text-align: center; padding: 120px 0; }
.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e8e8e8;
  border-top-color: $color-primary;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 24px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.drawing-text { font-size: $font-size-lg; color: $text-color-secondary; }
.paper-result { text-align: left; }
.service-card {
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s, background 0.2s;
  margin-bottom: $spacing-sm;

  &:hover {
    border-color: $color-primary-light;
    background: #fef9f0;
  }

  .service-inner {
    display: flex;
    align-items: center;
    gap: $spacing-md;
  }

  .service-icon {
    font-size: 36px;
    flex-shrink: 0;
  }

  .service-body {
    flex: 1;

    h3 {
      font-size: $font-size-lg;
      margin-bottom: 4px;
    }

    p {
      font-size: $font-size-sm;
      color: $text-color-secondary;
    }
  }

  .service-arrow {
    font-size: 24px;
    color: $color-primary;
    flex-shrink: 0;
  }
}
.thumbnail-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 40px;
  background: #fafafa;
  border: 1px dashed #ddd;
  border-radius: $border-radius;

  .placeholder-icon {
    font-size: 48px;
  }
}
@media (max-width: 768px) {
  .draw-result { flex-direction: column; }
  .draw-left { width: 100%; }
}
</style>
