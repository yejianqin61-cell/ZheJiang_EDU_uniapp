<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/api/index'

const router = useRouter()
const uploading = ref(false)
const uploadPercent = ref(0)
const form = ref({ subject: '', grade: '', file: null as File | null })
const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '科学']
const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '七年级', '八年级', '九年级', '高一', '高二', '高三']

const uploadStatusText = computed(() => uploading.value ? `上传中 ${uploadPercent.value}%` : '等待上传')

function onFileChange(event: Event) {
  const selectedFile = (event.target as HTMLInputElement).files?.[0]
  if (selectedFile) form.value.file = selectedFile
}

async function submit() {
  if (!form.value.subject || !form.value.grade) {
    ElMessage.warning('请选择学科和年级')
    return
  }
  if (!form.value.file) {
    ElMessage.warning('请选择文件')
    return
  }

  uploading.value = true
  uploadPercent.value = 0

  const formData = new FormData()
  formData.append('file', form.value.file)
  formData.append('subject', form.value.subject)
  formData.append('grade', form.value.grade)

  try {
    await api.post('/admin/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (!event.total) return
        uploadPercent.value = Math.min(100, Math.round((event.loaded / event.total) * 100))
      },
    })
    uploadPercent.value = 100
    ElMessage.success('上传成功，AI解析中...')
    router.push('/contribute')
  } catch (error: any) {
    ElMessage.error(error?.message ?? '上传失败')
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="upload-page">
    <div class="breadcrumb"><router-link to="/">首页</router-link><span class="breadcrumb__separator">›</span><router-link to="/contribute">我的贡献</router-link><span class="breadcrumb__separator">›</span><span class="breadcrumb__current">上传题目</span></div>
    <div class="page-card">
      <h3>上传题目文件</h3>
      <div class="mt-md">
        <label class="form-label">学科</label>
        <el-select v-model="form.subject" placeholder="选择学科" size="large" style="width:100%">
          <el-option v-for="subject in subjects" :key="subject" :label="subject" :value="subject" />
        </el-select>
      </div>
      <div class="mt-md">
        <label class="form-label">年级</label>
        <el-select v-model="form.grade" placeholder="选择年级" size="large" style="width:100%">
          <el-option v-for="grade in grades" :key="grade" :label="grade" :value="grade" />
        </el-select>
      </div>
      <div class="mt-md">
        <label class="form-label">文件</label>
        <input type="file" accept=".doc,.docx,.md,.pdf,.png,.jpg,.jpeg" @change="onFileChange" />
      </div>

      <div v-if="form.file" class="mt-md upload-progress">
        <div class="upload-progress__meta">
          <span>{{ form.file.name }}</span>
          <span class="text-secondary">{{ uploadStatusText }}</span>
        </div>
        <el-progress :percentage="uploadPercent" :status="uploadPercent === 100 && !uploading ? 'success' : undefined" />
      </div>

      <el-button type="primary" size="large" :loading="uploading" @click="submit" class="mt-md" style="width:100%">
        上传并提交
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.upload-page { max-width: 1500px; }

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
</style>
