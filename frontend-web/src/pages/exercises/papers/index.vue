<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPaperDetail } from '@/api/modules/exercise'
import api from '@/api/index'

const route = useRoute(); const router = useRouter()
const categoryId = ref((route.query.categoryId as string) || '')
const lessonId = ref((route.query.lessonId as string) || '')
const nodeName = ref((route.query.nodeName as string) || '')
const papers = ref<any[]>([]); const loading = ref(true)

onMounted(async () => {
  try {
    const params: any = {}
    if (categoryId.value) params.categoryId = categoryId.value
    else if (lessonId.value) params.lessonId = lessonId.value
    papers.value = await api.get('/exercise/papers', { params }) as any[]
  } catch { papers.value = [] } finally { loading.value = false }
})

function goDetail(id: string) { router.push(`/exercises/papers/${id}`) }
const typeMap: Record<string, string> = { docx: '📝', pdf: '📕', doc: '📝' }
</script>

<template>
  <div class="papers-page">
    <div class="breadcrumb">
      <router-link to="/">首页</router-link><span class="breadcrumb__separator">›</span>
      <router-link to="/exercises">练习</router-link><span class="breadcrumb__separator">›</span>
      <span class="breadcrumb__current">{{ nodeName || '试卷列表' }}</span>
    </div>

    <div v-if="loading" class="text-center" style="padding:60px"><p class="text-secondary">加载中…</p></div>

    <el-empty v-else-if="papers.length===0" description="暂无试卷">
      <el-button v-if="categoryId||lessonId" type="primary" @click="router.push('/contribute/exercise-upload')">上传试卷</el-button>
    </el-empty>

    <div v-else>
      <h2 class="papers-title">{{ nodeName || '试卷列表' }}<span class="text-secondary" style="font-size:14px;margin-left:8px">共 {{ papers.length }} 份</span></h2>
      <div class="paper-list">
        <div v-for="p in papers" :key="p.id" class="page-card paper-row" @click="goDetail(p.id)">
          <div class="paper-info">
            <span class="paper-icon">{{ typeMap[p.fileType] || '📄' }}</span>
            <div class="paper-body">
              <h4>{{ p.title }}</h4>
              <span class="paper-meta">{{ p.fileType?.toUpperCase() }} {{ p.fileSize ? '· '+(p.fileSize/1024).toFixed(0)+'KB' : '' }} {{ p.pageCount ? '· '+p.pageCount+'页' : '' }}</span>
            </div>
          </div>
          <el-button size="small" type="primary">查看</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.papers-page { max-width: 1000px; }
.papers-title { font-size: $font-size-xl; margin-bottom: $spacing-md; }
.paper-list { display: flex; flex-direction: column; gap: $spacing-sm; }
.paper-row { display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: $spacing-md $spacing-lg; transition: box-shadow 0.2s;
  &:hover { box-shadow: $box-shadow; }
}
.paper-info { display: flex; align-items: center; gap: $spacing-md; flex: 1; min-width: 0; }
.paper-icon { font-size: 28px; flex-shrink: 0; }
.paper-body { min-width: 0; h4 { font-size: $font-size-base; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } }
.paper-meta { font-size: $font-size-xs; color: $text-color-secondary; }
</style>
