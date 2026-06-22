<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMyExerciseUploadDetail, deleteMyExerciseUpload } from '@/api/modules/exercise'
import type { ExerciseUploadItem } from '@/types'

const route = useRoute(); const router = useRouter()
const item = ref<ExerciseUploadItem | null>(null)
const loading = ref(true)

const typeLabels: Record<string, string> = { sync: '同步练', unit: '单元练', topic: '专题练', exam: '期中期末' }
const stLabels: Record<string, string> = { pending_review: '待审核', approved: '已通过', rejected: '已拒绝' }
const stTypes: Record<string, string> = { pending_review: 'warning', approved: 'success', rejected: 'danger' }

onMounted(async () => {
  const id = route.params.id as string
  if (!id) { router.back(); return }
  try { item.value = await getMyExerciseUploadDetail(id) } catch { ElMessage.error('加载失败') } finally { loading.value = false }
})

async function handleDelete() {
  if (!item.value) return
  try {
    await ElMessageBox.confirm('确认删除此记录？', '删除', { type: 'warning' })
    await deleteMyExerciseUpload(item.value.id)
    ElMessage.success('已删除')
    router.replace('/contribute')
  } catch { /* cancel or error */ }
}
</script>

<template>
  <div class="ex-detail-page" v-if="!loading && item">
    <div class="breadcrumb">
      <router-link to="/">首页</router-link><span class="breadcrumb__separator">›</span>
      <router-link to="/contribute">我的贡献</router-link><span class="breadcrumb__separator">›</span>
      <span class="breadcrumb__current">练习详情</span>
    </div>

    <div class="page-card">
      <div class="detail-header">
        <h2>{{ item.title }}</h2>
        <el-tag :type="stTypes[item.status]" size="large">{{ stLabels[item.status] }}</el-tag>
      </div>

      <div class="info-grid mt-lg">
        <div class="info-row"><span>练习类型</span><span>{{ typeLabels[item.exerciseType] }}</span></div>
        <div class="info-row"><span>学科</span><span>{{ item.subject }}</span></div>
        <div class="info-row"><span>年级</span><span>{{ item.grade }}</span></div>
        <div class="info-row"><span>文件类型</span><span>{{ item.fileType?.toUpperCase() }}</span></div>
        <div class="info-row"><span>文件大小</span><span>{{ item.fileSize ? (item.fileSize/1024).toFixed(0)+' KB' : '—' }}</span></div>
        <div class="info-row"><span>提交时间</span><span>{{ item.createdAt }}</span></div>
        <div v-if="item.status==='approved'" class="info-row"><span>返现金额</span><span class="cashback-amount">¥{{ (item.cashbackAmount/100).toFixed(2) }}</span></div>
        <div v-if="item.status==='rejected' && item.reviewNote" class="info-row"><span>拒绝原因</span><span class="text-danger">{{ item.reviewNote }}</span></div>
      </div>
    </div>

    <div v-if="item.status!=='approved'" class="actions mt-md">
      <el-button type="danger" plain @click="handleDelete">删除记录</el-button>
    </div>
  </div>
  <div v-else-if="loading" class="text-center" style="padding:80px 0"><p class="text-secondary">加载中...</p></div>
</template>

<style scoped lang="scss">
.ex-detail-page { max-width: 1500px; }
.detail-header { display: flex; align-items: center; justify-content: space-between; gap: $spacing-md; h2 { font-size: $font-size-xl; } }
.info-grid { .info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: $font-size-sm; span:first-child { color: $text-color-secondary; } &:last-child { border-bottom: none; } } }
.cashback-amount { color: $color-primary; font-weight: 700; font-size: $font-size-lg; }
.actions { text-align: center; padding: $spacing-md 0; }
</style>
