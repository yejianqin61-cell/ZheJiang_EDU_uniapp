<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadFile } from '@/api/modules/admin'

const form = ref({ subject: '', grade: '' })
const file = ref<File | null>(null)
const uploading = ref(false)
const uploadPercent = ref(0)
const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '科学']
const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '七年级', '八年级', '九年级', '高一', '高二', '高三']

const uploadStatusText = computed(() => (uploading.value ? `上传中 ${uploadPercent.value}%` : '等待上传'))

function onFileChange(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

async function submit() {
  if (!form.value.subject || !form.value.grade) {
    ElMessage.warning('请选择学科和年级')
    return
  }

  if (!file.value) {
    ElMessage.warning('请选择文件')
    return
  }

  uploading.value = true
  uploadPercent.value = 0

  const formData = new FormData()
  formData.append('file', file.value)
  formData.append('subject', form.value.subject)
  formData.append('grade', form.value.grade)

  try {
    await uploadFile(formData, {
      onUploadProgress: (event) => {
        if (!event.total) {
          return
        }

        uploadPercent.value = Math.min(100, Math.round((event.loaded / event.total) * 100))
      },
    })
    uploadPercent.value = 100
    ElMessage.success('上传成功，AI解析中...')
    form.value = { subject: '', grade: '' }
    file.value = null
  } catch (error: any) {
    ElMessage.error(error?.message ?? '上传失败')
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-header__title">文件上传</h1>
    </div>
    <div class="page-card">
      <el-row :gutter="16">
        <el-col :span="12">
          <label class="form-label">学科</label>
          <el-select v-model="form.subject" placeholder="选择学科" size="large" style="width: 100%">
            <el-option v-for="subject in subjects" :key="subject" :label="subject" :value="subject" />
          </el-select>
        </el-col>
        <el-col :span="12">
          <label class="form-label">年级</label>
          <el-select v-model="form.grade" placeholder="选择年级" size="large" style="width: 100%">
            <el-option v-for="grade in grades" :key="grade" :label="grade" :value="grade" />
          </el-select>
        </el-col>
      </el-row>

      <div class="mt-md">
        <label class="form-label">选择文件</label>
        <input type="file" accept=".doc,.docx,.md,.pdf,.png,.jpg,.jpeg" @change="onFileChange" />
      </div>
      <p class="text-secondary mt-sm">支持格式: DOC / DOCX / MD / PDF / PNG / JPG</p>

      <div v-if="file" class="mt-md upload-progress">
        <div class="upload-progress__meta">
          <span>{{ file.name }}</span>
          <span class="text-secondary">{{ uploadStatusText }}</span>
        </div>
        <el-progress :percentage="uploadPercent" :status="uploadPercent === 100 && !uploading ? 'success' : undefined" />
      </div>

      <el-button
        type="primary"
        size="large"
        :loading="uploading"
        class="mt-md upload-button"
        @click="submit"
      >
        上传并开始AI解析
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.form-label {
  display: block;
  font-size: $font-size-sm;
  color: $text-color-secondary;
  margin-bottom: $spacing-xs;
}

.upload-progress {
  padding: $spacing-sm $spacing-md;
  background: #fafafa;
  border: 1px solid $border-color;
  border-radius: $border-radius;
}

.upload-progress__meta {
  display: flex;
  justify-content: space-between;
  gap: $spacing-md;
  margin-bottom: $spacing-xs;
  font-size: $font-size-sm;
}

.upload-button {
  min-width: 220px;
}
</style>
