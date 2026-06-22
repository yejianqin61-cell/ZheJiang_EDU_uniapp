<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getPaperDetail } from '@/api/modules/exercise'
import type { ExercisePaper } from '@/types'

const route = useRoute()
const router = useRouter()
const paper = ref<ExercisePaper | null>(null)
const loading = ref(true)

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

onMounted(async () => {
  const id = route.params.id as string
  if (!id) {
    router.back()
    return
  }

  try {
    paper.value = await getPaperDetail(id)
  }
  catch (error: unknown) {
    paper.value = null
    ElMessage.error(getErrorMessage(error, '练习试卷详情加载失败'))
  }
  finally {
    loading.value = false
  }
})

function goDownload() {
  if (!paper.value) return
  router.push(`/payment?paperId=${paper.value.id}&type=exercise`)
}

function goPrint() {
  if (!paper.value) return
  router.push(`/print/checkout?paperId=${paper.value.id}`)
}
</script>

<template>
  <div class="detail-page" v-if="!loading && paper">
    <div class="breadcrumb">
      <router-link to="/">首页</router-link><span class="breadcrumb__separator">›</span>
      <router-link to="/exercises">练习</router-link><span class="breadcrumb__separator">›</span>
      <span class="breadcrumb__current">{{ paper?.title }}</span>
    </div>

    <div class="detail-body">
      <div class="detail-left">
        <div class="thumbnail-wrap">
          <img v-if="paper?.thumbnailUrl" :src="paper?.thumbnailUrl" alt="缩略图" />
          <div v-else class="thumbnail-placeholder"><span>📄</span><span>{{ paper?.fileType?.toUpperCase() }} 文件</span></div>
        </div>
      </div>
      <div class="detail-right">
        <div class="page-card">
          <h2>{{ paper?.title }}</h2>
          <p class="text-secondary mt-sm">{{ paper?.fileType?.toUpperCase() }} {{ paper?.fileSize ? '· ' + (paper.fileSize / 1024).toFixed(0) + 'KB' : '' }} {{ paper?.pageCount ? '· ' + paper.pageCount + '页' : '' }}</p>
        </div>
        <div class="diversion mt-md">
          <div class="service-card page-card" @click="goDownload">
            <div class="service-inner"><span class="service-icon">📥</span><div class="service-body"><h3>下载服务</h3><p>支付后下载原始文件，自行打印</p></div><span class="service-arrow">›</span></div>
          </div>
          <div class="service-card page-card" @click="goPrint">
            <div class="service-inner"><span class="service-icon">🖨️</span><div class="service-body"><h3>打印服务</h3><p>在线支付，我们打印好快递上门</p></div><span class="service-arrow">›</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else-if="loading" class="text-center" style="padding:80px 0"><p class="text-secondary">加载中...</p></div>
</template>

<style scoped lang="scss">
.detail-page { max-width: 1100px; }
.detail-body { display: flex; gap: $spacing-lg; align-items: flex-start; }
.detail-left { width: 420px; flex-shrink: 0; }
.detail-right { flex: 1; min-width: 0; }
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
.thumbnail-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 60px 20px;
  background: #fafafa;
  border: 1px dashed #ddd;
  border-radius: $border-radius;

  span:first-child { font-size: 48px; }
  span { font-size: $font-size-sm; color: $text-color-secondary; }
}
.service-card { cursor: pointer; border: 2px solid transparent; transition: border-color 0.2s, background 0.2s; margin-bottom: $spacing-sm;
  &:hover { border-color: $color-primary-light; background: #fef9f0; }
  .service-inner { display: flex; align-items: center; gap: $spacing-md; }
  .service-icon { font-size: 36px; flex-shrink: 0; }
  .service-body { flex: 1; h3 { font-size: $font-size-lg; margin-bottom: 4px; } p { font-size: $font-size-sm; color: $text-color-secondary; } }
  .service-arrow { font-size: 24px; color: $color-primary; flex-shrink: 0; }
}
@media (max-width: 768px) { .detail-body { flex-direction: column; } .detail-left { width: 100%; } }
</style>
