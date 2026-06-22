<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  getUploadCategories,
  getUploadLessons,
  uploadExercisePaper,
  type ExerciseCategory,
  type ExerciseLesson,
} from '@/api/modules/exercise'

const router = useRouter()

const exerciseType = ref<'sync' | 'unit' | 'topic' | 'exam'>('unit')
const subject = ref('')
const grade = ref('')
const title = ref('')
const categoryId = ref('')
const lessonId = ref('')
const file = ref<File | null>(null)
const submitting = ref(false)

const categories = ref<ExerciseCategory[]>([])
const lessons = ref<ExerciseLesson[]>([])

const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '科学']
const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '七年级', '八年级', '九年级', '高一', '高二', '高三']
const typeLabels: Record<string, string> = { sync: '同步练', unit: '单元练', topic: '专题练', exam: '期中期末' }

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message
  }

  return fallback
}

// 加载类目
async function loadCategories() {
  if (!grade.value || !subject.value) { categories.value = []; return }
  try {
    categories.value = await getUploadCategories({
      grade: grade.value,
      subject: subject.value,
      exerciseType: exerciseType.value,
    })
  }
  catch (error: unknown) {
    categories.value = []
    ElMessage.error(getErrorMessage(error, '类目加载失败'))
  }
}

// 加载课时（仅同步练）
async function loadLessons() {
  if (exerciseType.value !== 'sync' || !categoryId.value) { lessons.value = []; return }
  try {
    lessons.value = await getUploadLessons(categoryId.value)
  }
  catch (error: unknown) {
    lessons.value = []
    ElMessage.error(getErrorMessage(error, '课时加载失败'))
  }
}

watch([grade, subject, exerciseType], () => { categoryId.value = ''; lessonId.value = ''; loadCategories() })
watch(categoryId, () => { lessonId.value = ''; loadLessons() })

function onFileChange(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function handleSubmit() {
  if (!exerciseType.value) { ElMessage.warning('请选择练习类型'); return }
  if (!subject.value || !grade.value) { ElMessage.warning('请选择学科和年级'); return }
  if (!title.value.trim()) { ElMessage.warning('请输入试卷标题'); return }
  if (!categoryId.value) { ElMessage.warning('请选择所属类目'); return }
  if (!file.value) { ElMessage.warning('请选择文件'); return }

  const ext = file.value.name.split('.').pop()?.toLowerCase()
  if (ext !== 'docx' && ext !== 'pdf') { ElMessage.warning('仅支持 .docx 和 .pdf 格式'); return }

  submitting.value = true
  try {
    const fd = new FormData()
    fd.append('title', title.value.trim())
    fd.append('subject', subject.value)
    fd.append('grade', grade.value)
    fd.append('exerciseType', exerciseType.value)
    fd.append('categoryId', categoryId.value)
    if (lessonId.value) fd.append('lessonId', lessonId.value)
    fd.append('file', file.value)

    await uploadExercisePaper(fd)
    ElMessage.success('上传成功，等待管理员审核')
    router.push('/contribute')
  }
  catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '上传失败'))
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="ex-upload-page">
    <div class="breadcrumb">
      <router-link to="/">首页</router-link><span class="breadcrumb__separator">›</span>
      <router-link to="/contribute">我的贡献</router-link><span class="breadcrumb__separator">›</span>
      <span class="breadcrumb__current">上传练习试卷</span>
    </div>

    <div class="page-card">
      <h2 class="section-title">练习类型</h2>
      <div class="type-tabs">
        <span v-for="t in (['sync','unit','topic','exam'] as const)" :key="t"
          class="type-tab" :class="{ active: exerciseType === t }"
          @click="exerciseType = t">{{ typeLabels[t] }}</span>
      </div>
    </div>

    <div class="page-card mt-md">
      <h2 class="section-title">基本信息</h2>
      <el-row :gutter="16">
        <el-col :span="12">
          <label class="form-label">学科</label>
          <el-select v-model="subject" placeholder="选择学科" size="large" style="width:100%">
            <el-option v-for="s in subjects" :key="s" :label="s" :value="s" />
          </el-select>
        </el-col>
        <el-col :span="12">
          <label class="form-label">年级</label>
          <el-select v-model="grade" placeholder="选择年级" size="large" style="width:100%">
            <el-option v-for="g in grades" :key="g" :label="g" :value="g" />
          </el-select>
        </el-col>
      </el-row>

      <div class="mt-md">
        <label class="form-label">试卷标题</label>
        <el-input v-model="title" placeholder="如：人教版五年级数学第三章测试卷" size="large" maxlength="128" />
      </div>

      <el-row :gutter="16" class="mt-md">
        <el-col :span="12">
          <label class="form-label">所属类目 <span style="color:#e74c3c">*</span></label>
          <el-select v-model="categoryId" placeholder="选择类目" size="large" style="width:100%" :disabled="!grade||!subject">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-col>
        <el-col :span="12" v-if="exerciseType==='sync'">
          <label class="form-label">所属课时（选填）</label>
          <el-select v-model="lessonId" placeholder="选择课时" size="large" style="width:100%" :disabled="!categoryId" clearable>
            <el-option v-for="l in lessons" :key="l.id" :label="l.name" :value="l.id" />
          </el-select>
        </el-col>
      </el-row>
    </div>

    <div class="page-card mt-md">
      <h2 class="section-title">上传文件</h2>
      <p class="text-secondary mb-sm">支持 .docx / .pdf 格式</p>
      <input type="file" accept=".docx,.pdf" @change="onFileChange" />
      <p v-if="file" class="mt-sm text-secondary">已选择：{{ file.name }} ({{ (file.size/1024).toFixed(0) }} KB)</p>
    </div>

    <div class="submit-section">
      <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit" style="min-width:200px">提交审核</el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ex-upload-page { max-width: 1500px; }
.section-title { font-size: $font-size-lg; font-weight: 600; margin-bottom: $spacing-md; }
.form-label { display: block; font-size: $font-size-sm; color: $text-color-secondary; margin-bottom: $spacing-xs; }
.type-tabs { display: flex; gap: $spacing-sm; }
.type-tab { padding: 8px 20px; border-radius: $border-radius; cursor: pointer; border: 1px solid $border-color; font-size: $font-size-base; transition: all 0.2s;
  &:hover { border-color: $color-primary-light; color: $color-primary; }
  &.active { background: $color-primary; color: #fff; border-color: $color-primary; }
}
.submit-section { text-align: center; padding: $spacing-xl 0; }
</style>
