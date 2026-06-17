<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePaperStore } from '@/stores/paper'
import { ElMessage } from 'element-plus'

const router = useRouter()
const paper = usePaperStore()

const stages = ['小学', '初中', '高中']
const gradeMap: Record<string, string[]> = {
  '小学': ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],
  '初中': ['七年级', '八年级', '九年级'],
  '高中': ['高一', '高二', '高三'],
}
const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理']
const difficulties = [
  { value: '1', label: '简单' },
  { value: '2', label: '中等' },
  { value: '3', label: '困难' },
  { value: 'mixed', label: '混合' },
]

const selectedStage = ref('')
const generating = ref(false)
const genProgress = ref(0)
let progressTimer: ReturnType<typeof setInterval> | null = null

function selectStage(stage: string) { selectedStage.value = stage }
function selectGrade(grade: string) { paper.condition.grade = grade }
function selectSubject(subject: string) {
  paper.condition.subject = subject
  paper.condition.knowledgePointIds = []
  paper.fetchKnowledgePoints()
}
function toggleKp(kpId: string) {
  const ids = paper.condition.knowledgePointIds ?? []
  const idx = ids.indexOf(kpId)
  if (idx >= 0) { ids.splice(idx, 1) } else { ids.push(kpId) }
}
function isKpSelected(kpId: string): boolean {
  return (paper.condition.knowledgePointIds ?? []).includes(kpId)
}

async function handleGenerate() {
  if (!paper.condition.subject) { ElMessage.warning('请选择科目'); return }
  if (!paper.condition.grade) { ElMessage.warning('请选择年级'); return }

  generating.value = true; genProgress.value = 0
  const startTime = Date.now(); const duration = 30000
  progressTimer = setInterval(() => {
    genProgress.value = Math.min(95, Math.round(((Date.now() - startTime) / duration) * 100))
  }, 200)

  try {
    await paper.generate()
    genProgress.value = 100
    await new Promise(r => setTimeout(r, 300))
  } catch { /* stay */ }
  finally {
    if (progressTimer) clearInterval(progressTimer)
    generating.value = false
  }

  if (paper.currentPaper) router.push('/paper/preview')
}
</script>

<template>
  <div class="config-page">
    <div class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="breadcrumb__separator">›</span>
      <span class="breadcrumb__current">AI组卷</span>
    </div>

    <div class="page-card">
      <h2 class="section-title">选择年级科目</h2>
      <div class="form-group">
        <label>学段</label>
        <div class="tag-group">
          <span v-for="s in stages" :key="s" class="tag" :class="{ active: selectedStage === s }" @click="selectStage(s)">{{ s }}</span>
        </div>
      </div>
      <div v-if="selectedStage" class="form-group">
        <label>年级</label>
        <div class="tag-group">
          <span v-for="g in gradeMap[selectedStage]" :key="g" class="tag" :class="{ active: paper.condition.grade === g }" @click="selectGrade(g)">{{ g }}</span>
        </div>
      </div>
      <div class="form-group">
        <label>科目</label>
        <div class="tag-group">
          <span v-for="s in subjects" :key="s" class="tag" :class="{ active: paper.condition.subject === s }" @click="selectSubject(s)">{{ s }}</span>
        </div>
      </div>
    </div>

    <div v-if="paper.knowledgePoints.length > 0" class="page-card mt-md">
      <h2 class="section-title">知识点（可选）</h2>
      <div class="tag-group">
        <span v-for="kp in paper.knowledgePoints" :key="kp.id" class="tag" :class="{ active: isKpSelected(kp.id) }" @click="toggleKp(kp.id)">{{ kp.name }} ({{ kp.questionCount }})</span>
      </div>
    </div>

    <div class="page-card mt-md">
      <h2 class="section-title">难度与题量</h2>
      <div class="form-group">
        <label>难度</label>
        <el-radio-group v-model="paper.condition.difficulty" size="large">
          <el-radio-button v-for="d in difficulties" :key="d.value" :value="d.value">{{ d.label }}</el-radio-button>
        </el-radio-group>
      </div>
      <div class="form-group">
        <label>题量：{{ paper.condition.questionCount }} 题</label>
        <el-slider v-model="paper.condition.questionCount" :min="1" :max="50" show-input style="max-width:500px" />
      </div>
    </div>

    <div class="generate-section">
      <el-button type="primary" size="large" :loading="paper.loading" @click="handleGenerate">开始AI组卷</el-button>
    </div>

    <el-dialog v-model="generating" title="AI 正在生成试卷..." width="420px" :close-on-click-modal="false" :show-close="false" center>
      <div class="progress-wrap">
        <el-progress :percentage="genProgress" :stroke-width="16" :text-inside="true" />
        <p class="progress-hint">预计还需 {{ Math.ceil((100 - genProgress) / 100 * 30) }} 秒</p>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.config-page { max-width: 800px; margin: 0 auto; }
.section-title { font-size: $font-size-lg; font-weight: 600; margin-bottom: $spacing-lg; }
.form-group { margin-bottom: $spacing-lg; label { display: block; font-size: $font-size-sm; color: $text-color-secondary; margin-bottom: $spacing-sm; } }
.tag-group { display: flex; flex-wrap: wrap; gap: $spacing-sm; }
.tag { display: inline-block; padding: 6px 16px; background: #f0f0f0; border-radius: $border-radius; font-size: $font-size-sm; cursor: pointer; user-select: none; transition: all 0.2s; border: 1px solid transparent; &:hover { border-color: $color-primary-light; color: $color-primary; } &.active { background: $color-primary; color: #fff; border-color: $color-primary; } }
.generate-section { text-align: center; padding: $spacing-xl 0; .el-button { min-width: 200px; height: 48px; font-size: $font-size-lg; } }
.progress-wrap { padding: $spacing-lg 0; text-align: center; .progress-hint { margin-top: $spacing-md; font-size: $font-size-sm; color: $text-color-secondary; } }
</style>
