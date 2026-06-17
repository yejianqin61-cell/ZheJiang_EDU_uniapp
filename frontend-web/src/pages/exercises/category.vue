<script setup lang="ts">
import { ref, onMounted } from 'vue'; import { useRoute, useRouter } from 'vue-router'
import { getExerciseCategories, getExerciseLessons } from '@/api/modules/exercise'
import { ElMessage } from 'element-plus'
const route = useRoute(); const router = useRouter()
const qType = (route.query.type as string)||'unit'
const qGrade = (route.query.grade as string)||''
const qSubject = (route.query.subject as string)||''
const cats = ref<any[]>([]); const lessonsMap = ref<Record<string,any[]>>({}); const loading = ref(true)

onMounted(async () => {
  try { cats.value = await getExerciseCategories({type:qType,grade:qGrade,subject:qSubject}) } catch { ElMessage.error('加载类目失败') }
  // 同步练时加载每个单元的课时
  if(qType==='sync') {
    for(const c of cats.value) {
      try { lessonsMap.value[c.id] = await getExerciseLessons(c.id) } catch { lessonsMap.value[c.id] = []; ElMessage.error(`加载课时失败: ${c.name}`) }
    }
  }
  loading.value=false
})

function drawCategory(id:string) { router.push(`/exercises/draw?nodeType=category&nodeId=${id}`) }
function drawLesson(id:string) { router.push(`/exercises/draw?nodeType=lesson&nodeId=${id}`) }
const typeLabels: Record<string,string> = { sync:'同步练', unit:'单元练', topic:'专题练', exam:'期中期末练' }
</script>

<template>
  <div class="category-page">
    <div class="breadcrumb"><router-link to="/">首页</router-link><span class="breadcrumb__separator">›</span><router-link to="/exercises">练习</router-link><span class="breadcrumb__separator">›</span><span class="breadcrumb__current">{{ typeLabels[qType]||qType }}</span></div>
    <div class="page-header"><h1 class="page-header__title">{{ typeLabels[qType] }} · {{ qGrade }} · {{ qSubject }}</h1></div>

    <div v-if="loading" class="text-center" style="padding:60px"><p class="text-secondary">加载中...</p></div>

    <!-- 单元练 / 专题练 / 期中期末：直接列类目 -->
    <template v-if="qType!=='sync'">
      <el-empty v-if="!loading&&cats.length===0" description="暂无类目" />
      <div v-else class="cat-row">
      <div v-for="c in cats" :key="c.id" class="page-card cat-card" @click="drawCategory(c.id)">
        <span class="cat-name">{{ c.name }}</span><el-button type="primary" size="small">🤖 AI智能抽取题目</el-button>
      </div>
      </div>
    </template>

    <!-- 同步练：单元 → 课时 -->
    <template v-else>
      <el-empty v-if="!loading&&cats.length===0" description="暂无单元" />
      <div v-for="c in cats" :key="c.id" class="page-card unit-block">
        <h3>{{ c.name }}</h3>
        <div v-if="!lessonsMap[c.id]?.length" class="text-secondary mt-sm">暂无课时</div>
        <div v-for="l in lessonsMap[c.id]" :key="l.id" class="lesson-row" @click="drawLesson(l.id)">
          <span>{{ l.name }}</span><el-button type="primary" size="small">🤖 AI智能抽取题目</el-button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.category-page{max-width:1500px}
.cat-row{display:grid;grid-template-columns:repeat(2,1fr);gap:$spacing-md}
.cat-card{display:flex;align-items:center;justify-content:space-between;cursor:pointer;&:hover{box-shadow:$box-shadow}.cat-name{font-weight:500}}
.unit-block{margin-bottom:$spacing-md;h3{margin-bottom:$spacing-sm}}
.lesson-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-top:1px solid #f5f5f5;cursor:pointer;&:hover{color:$color-primary}}
</style>
