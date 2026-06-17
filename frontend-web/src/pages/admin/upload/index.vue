<script setup lang="ts">
import { ref } from 'vue'; import api from '@/api/index'; import { ElMessage } from 'element-plus'
const form = ref({ subject:'', grade:'' }); const file = ref<File|null>(null); const uploading = ref(false)
const subjects = ['语文','数学','英语','物理','化学','生物','政治','历史','地理']
const grades = ['一年级','二年级','三年级','四年级','五年级','六年级','七年级','八年级','九年级','高一','高二','高三']
function onFileChange(e:Event) { file.value = (e.target as HTMLInputElement).files?.[0]??null }
async function submit() {
  if(!form.value.subject||!form.value.grade){ElMessage.warning('请选择学科和年级');return}
  if(!file.value){ElMessage.warning('请选择文件');return}
  uploading.value=true; const fd=new FormData(); fd.append('file',file.value); fd.append('subject',form.value.subject); fd.append('grade',form.value.grade)
  try { await api.post('/admin/files/upload',fd,{headers:{'Content-Type':'multipart/form-data'}}); ElMessage.success('上传成功，AI解析中...'); form.value={subject:'',grade:''}; file.value=null } catch(e:any) { ElMessage.error(e?.message??'上传失败') } finally { uploading.value=false }
}
</script>

<template>
  <div>
    <div class="page-header"><h1 class="page-header__title">文件上传</h1></div>
    <div class="page-card">
      <el-row :gutter="16"><el-col :span="12"><label class="form-label">学科</label><el-select v-model="form.subject" placeholder="选择学科" size="large" style="width:100%"><el-option v-for="s in subjects" :key="s" :label="s" :value="s"/></el-select></el-col><el-col :span="12"><label class="form-label">年级</label><el-select v-model="form.grade" placeholder="选择年级" size="large" style="width:100%"><el-option v-for="g in grades" :key="g" :label="g" :value="g"/></el-select></el-col></el-row>
      <div class="mt-md"><label class="form-label">选择文件</label><input type="file" accept=".doc,.docx,.md,.pdf,.png,.jpg,.jpeg" @change="onFileChange"/></div>
      <p class="text-secondary mt-sm">支持格式: DOC / DOCX / MD / PDF / PNG / JPG</p>
      <el-button type="primary" size="large" :loading="uploading" @click="submit" class="mt-md" style="width:100%">上传并开始AI解析</el-button>
    </div>
  </div>
</template>
<style scoped lang="scss">.form-label{display:block;font-size:$font-size-sm;color:$text-color-secondary;margin-bottom:$spacing-xs}</style>
