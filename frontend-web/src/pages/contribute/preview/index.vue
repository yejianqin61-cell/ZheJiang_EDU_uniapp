<script setup lang="ts">
import { ref, onMounted } from 'vue'; import { useRoute, useRouter } from 'vue-router'; import api from '@/api/index'; import { ElMessage } from 'element-plus'; import { renderMarkdown } from '@/composables/useMarkdown'
const route = useRoute(); const router = useRouter(); const questions = ref<any[]>([]); const loading = ref(true); const submitting = ref(false)
onMounted(async () => { try { const d = await api.get(`/contributions/${route.query.id}`); questions.value = d?.questions??d??[] } catch {} finally { loading.value = false } })
async function submit() { submitting.value=true; try { await api.post(`/contributions/${route.query.id}/submit`); ElMessage.success('已提交审核'); router.replace('/contribute') } catch(e:any) { ElMessage.error(e?.message??'提交失败') } finally { submitting.value=false } }
</script>

<template>
  <div class="preview-page">
    <div class="breadcrumb"><router-link to="/">首页</router-link><span class="breadcrumb__separator">›</span><router-link to="/contribute">我的贡献</router-link><span class="breadcrumb__separator">›</span><span class="breadcrumb__current">题目预览</span></div>
    <div v-if="loading" class="text-center" style="padding:80px 0"><p class="text-secondary">AI 解析中...</p></div>
    <div v-else>
      <div v-for="(q,i) in questions" :key="i" class="page-card question-card"><div class="q-header"><span class="q-index">{{ i+1 }}.</span><el-tag size="small">{{ q.type }}</el-tag></div><p class="q-content" v-html="renderMarkdown(q.content)"></p><div v-if="q.options?.length" class="q-options"><div v-for="(o,j) in q.options" :key="j" class="q-option">{{ o }}</div></div></div>
      <div class="actions"><el-button type="primary" size="large" :loading="submitting" @click="submit" style="width:100%">确认无误，提交审核</el-button></div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.preview-page{max-width:1500px}
.question-card{margin-bottom:$spacing-md;.q-header{display:flex;align-items:center;gap:$spacing-sm;margin-bottom:$spacing-md}.q-index{font-weight:700;font-size:$font-size-lg}.q-content{font-size:$font-size-base;line-height:1.8;white-space:pre-wrap}.q-options{margin-top:$spacing-md}.q-option{padding:4px 0;color:$text-color-secondary}}
.actions{padding:$spacing-lg 0}
</style>
