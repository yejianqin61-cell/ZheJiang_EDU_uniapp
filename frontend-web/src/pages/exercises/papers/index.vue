<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getPapersByCategory, getPapersByLesson } from '@/api/modules/exercise'
import type { ExercisePaper } from '@/types'

const route = useRoute()
const router = useRouter()
const categoryId = ref((route.query.categoryId as string) || '')
const lessonId = ref((route.query.lessonId as string) || '')
const nodeName = ref((route.query.nodeName as string) || '')
const papers = ref<ExercisePaper[]>([])
const loading = ref(true)

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

onMounted(async () => {
  try {
    if (categoryId.value) {
      const data = await getPapersByCategory(categoryId.value)
      papers.value = Array.isArray(data) ? data : data?.list ?? []
    }
    else if (lessonId.value) {
      const data = await getPapersByLesson(lessonId.value)
      papers.value = Array.isArray(data) ? data : data?.list ?? []
    }
    else {
      papers.value = []
    }
  }
  catch (error: unknown) {
    papers.value = []
    ElMessage.error(getErrorMessage(error, '练习试卷列表加载失败'))
  }
  finally {
    loading.value = false
  }
})

function goDetail(id: string) {
  router.push(`/exercises/papers/${id}`)
}

const typeMap: Record<string, string> = { docx: '📝', pdf: '📕', doc: '📝' }
</script>

<template>
  <div class="papers-page">
    <div class="breadcrumb">
      <router-link to="/">首页</router-link><span class="breadcrumb__separator">›</span>
      <router-link to="/exercises">练习</router-link><span class="breadcrumb__separator">›</span>
      <span class="breadcrumb__current">{{ nodeName || '试卷列表' }}</span>
    </div>

    <div v-if="loading" class="loading-wrap"><p class="text-secondary">加载中…</p></div>

    <el-empty v-else-if="papers.length === 0" description="暂无试卷">
      <el-button v-if="categoryId || lessonId" type="primary" @click="router.push('/contribute/exercise-upload')">上传试卷</el-button>
    </el-empty>

    <div v-else>
      <h2 class="papers-title">{{ nodeName || '试卷列表' }}<span class="title-total">共 {{ papers.length }} 份</span></h2>
      <div class="paper-list">
        <div v-for="paper in papers" :key="paper.id" class="page-card paper-row" @click="goDetail(paper.id)">
          <div class="paper-info">
            <span class="paper-icon">{{ typeMap[paper.fileType] || '📄' }}</span>
            <div class="paper-body">
              <h4>{{ paper.title }}</h4>
              <span class="paper-meta">
                {{ paper.fileType?.toUpperCase() }}
                {{ paper.fileSize ? ` · ${(paper.fileSize / 1024).toFixed(0)}KB` : '' }}
                {{ paper.pageCount ? ` · ${paper.pageCount}页` : '' }}
              </span>
            </div>
          </div>
          <el-button size="small" type="primary">查看</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.papers-page {
  max-width: 1000px;
}

.loading-wrap {
  padding: 60px;
  text-align: center;
}

.papers-title {
  margin-bottom: $spacing-md;
  font-size: $font-size-xl;
}

.title-total {
  margin-left: 8px;
  font-size: 14px;
}

.paper-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.paper-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-md $spacing-lg;
  cursor: pointer;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: $box-shadow;
  }
}

.paper-info {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: $spacing-md;
}

.paper-icon {
  flex-shrink: 0;
  font-size: 28px;
}

.paper-body {
  min-width: 0;

  h4 {
    margin-bottom: 2px;
    overflow: hidden;
    font-size: $font-size-base;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.paper-meta {
  font-size: $font-size-xs;
  color: $text-color-secondary;
}
</style>
