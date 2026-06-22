<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getExerciseCategories, getExerciseLessons, type ExerciseCategory, type ExerciseLesson } from '@/api/modules/exercise'

const route = useRoute()
const router = useRouter()

const qType = (route.query.type as string) || 'unit'
const qGrade = (route.query.grade as string) || ''
const qSubject = (route.query.subject as string) || ''

const cats = ref<ExerciseCategory[]>([])
const lessonsMap = ref<Record<string, ExerciseLesson[]>>({})
const loading = ref(true)

const typeLabels: Record<string, string> = {
  sync: '同步练',
  unit: '单元练',
  topic: '专题练',
  exam: '期中期末练',
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message
  }

  return fallback
}

onMounted(async () => {
  try {
    cats.value = await getExerciseCategories({ type: qType, grade: qGrade, subject: qSubject })
  }
  catch (error: unknown) {
    cats.value = []
    ElMessage.error(getErrorMessage(error, '加载类目失败'))
  }

  if (qType === 'sync') {
    for (const category of cats.value) {
      try {
        lessonsMap.value[category.id] = await getExerciseLessons(category.id)
      }
      catch (error: unknown) {
        lessonsMap.value[category.id] = []
        ElMessage.error(getErrorMessage(error, `加载课时失败: ${category.name}`))
      }
    }
  }

  loading.value = false
})

function goPapersByCategory(id: string, name: string) {
  router.push(`/exercises/papers?categoryId=${id}&nodeName=${encodeURIComponent(name)}`)
}

function goPapersByLesson(id: string, name: string) {
  router.push(`/exercises/papers?lessonId=${id}&nodeName=${encodeURIComponent(name)}`)
}
</script>

<template>
  <div class="category-page">
    <div class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="breadcrumb__separator">›</span>
      <router-link to="/exercises">练习</router-link>
      <span class="breadcrumb__separator">›</span>
      <span class="breadcrumb__current">{{ typeLabels[qType] || qType }}</span>
    </div>
    <div class="page-header">
      <h1 class="page-header__title">{{ typeLabels[qType] }} · {{ qGrade }} · {{ qSubject }}</h1>
    </div>

    <div v-if="loading" class="text-center" style="padding:60px">
      <p class="text-secondary">加载中...</p>
    </div>

    <template v-if="qType !== 'sync'">
      <el-empty v-if="!loading && cats.length === 0" description="暂无类目" />
      <div v-else class="cat-row">
        <div
          v-for="category in cats"
          :key="category.id"
          class="page-card cat-card"
          @click="goPapersByCategory(category.id, category.name)"
        >
          <span class="cat-name">{{ category.name }}</span>
          <el-button type="primary" size="small">查看试卷</el-button>
        </div>
      </div>
    </template>

    <template v-else>
      <el-empty v-if="!loading && cats.length === 0" description="暂无单元" />
      <div v-for="category in cats" :key="category.id" class="page-card unit-block">
        <h3>{{ category.name }}</h3>
        <div v-if="!lessonsMap[category.id]?.length" class="text-secondary mt-sm">暂无课时</div>
        <div
          v-for="lesson in lessonsMap[category.id]"
          :key="lesson.id"
          class="lesson-row"
          @click="goPapersByLesson(lesson.id, lesson.name)"
        >
          <span>{{ lesson.name }}</span>
          <el-button type="primary" size="small">查看试卷</el-button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.category-page { max-width: 1500px; }
.cat-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: $spacing-md; }
.cat-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;

  &:hover { box-shadow: $box-shadow; }

  .cat-name { font-weight: 500; }
}
.unit-block {
  margin-bottom: $spacing-md;

  h3 { margin-bottom: $spacing-sm; }
}
.lesson-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-top: 1px solid #f5f5f5;
  cursor: pointer;

  &:hover { color: $color-primary; }
}
</style>
