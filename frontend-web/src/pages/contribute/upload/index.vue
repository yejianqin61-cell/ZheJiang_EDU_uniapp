<script setup lang="ts">
import { ref } from 'vue'; import { useRouter } from 'vue-router'; import api from '@/api/index'; import { ElMessage } from 'element-plus'
const router = useRouter(); const uploading = ref(false)
const form = ref({ subject:'', grade:'', file: null as File|null })
const subjects = ['语文','数学','英语','物理','化学','生物','政治','历史','地理']
const grades = ['一年级','二年级','三年级','四年级','五年级','六年级','七年级','八年级','九年级','高一','高二','高三']
function onFileChange(e: Event) { const f = (e.target as HTMLInputElement).files?.[0]; if(f) form.value.file = f }
async function submit() {
  if(!form.value.subject||!form.value.grade){ElMessage.warning('请选择学科和年级');return}
  if(!form.value.file){ElMessage.warning('请选择文件');return}
  uploading.value=true; const fd = new FormData(); fd.append('file',form.value.file); fd.append('subject',form.value.subject); fd.append('grade',form.value.grade)
  try { await api.post('/admin/files/upload',fd,{headers:{'Content-Type':'multipart/form-data'}}); ElMessage.success('上传成功，AI解析中...'); router.push('/contribute') } catch(e:any) { ElMessage.error(e?.message??'上传失败') } finally { uploading.value=false }
}
</script>

<template>
  <div class="upload-page">
    <div class="breadcrumb"><router-link to="/">首页</router-link><span class="breadcrumb__separator">›</span><router-link to="/contribute">我的贡献</router-link><span class="breadcrumb__separator">›</span><span class="breadcrumb__current">上传题目</span></div>
    <div class="page-card">
      <h3>上传题目文件</h3>
      <div class="mt-md"><label class="form-label">学科</label><el-select v-model="form.subject" placeholder="选择学科" size="large" style="width:100%"><el-option v-for="s in subjects" :key="s" :label="s" :value="s"/></el-select></div>
      <div class="mt-md"><label class="form-label">年级</label><el-select v-model="form.grade" placeholder="选择年级" size="large" style="width:100%"><el-option v-for="g in grades" :key="g" :label="g" :value="g"/></el-select></div>
      <div class="mt-md"><label class="form-label">文件</label><input type="file" accept=".doc,.docx,.md,.pdf,.png,.jpg,.jpeg" @change="onFileChange" /></div>
      <el-button type="primary" size="large" :loading="uploading" @click="submit" class="mt-md" style="width:100%">上传并提交</el-button>
    </div>
  </div>
</template>
<style scoped lang="scss">
.upload-page{max-width:600px;margin:0 auto}
.form-label{display:block;font-size:$font-size-sm;color:$text-color-secondary;margin-bottom:$spacing-xs}
</style>
