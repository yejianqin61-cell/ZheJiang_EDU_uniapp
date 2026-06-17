<script setup lang="ts">
import { ref, onMounted } from 'vue'; import { useRoute, useRouter } from 'vue-router'; import api from '@/api/index'; import { ElMessage } from 'element-plus'; import { renderMarkdown } from '@/composables/useMarkdown'
const route = useRoute(); const router = useRouter(); const item = ref<any>(null); const loading = ref(true)
onMounted(async () => { try { item.value = await api.get(`/admin/questions/${route.params.id}`) } catch {} finally { loading.value = false } })
async function del() { try { await api.delete(`/admin/questions/${route.params.id}`); ElMessage.success('已删除'); router.back() } catch(e:any) { ElMessage.error(e?.message??'删除失败') } }
</script>

<template>
  <div class="detail-page">
    <div class="breadcrumb"><router-link to="/admin/questions">题库管理</router-link><span class="breadcrumb__separator">›</span><span class="breadcrumb__current">题目详情</span></div>
    <div v-if="loading" class="text-center" style="padding:80px 0"><p class="text-secondary">加载中...</p></div>
    <div v-else-if="item" class="page-card">
      <div class="q-header"><el-tag size="large">{{ item.type }}</el-tag><el-tag size="large" type="warning" class="ml-sm">难度 {{ item.difficulty }}</el-tag><el-tag size="large" class="ml-sm">{{ item.subject }} · {{ item.grade }}</el-tag></div>
      <p class="q-content mt-md" v-html="renderMarkdown(item.content)"></p>
      <div v-if="item.options?.length" class="q-options mt-md"><div v-for="(o,i) in item.options" :key="i" class="q-option">{{ o }}</div></div>
      <div class="mt-lg"><h4>答案</h4><p class="text-secondary mt-sm">{{ item.answer }}</p></div>
      <div class="mt-md" v-if="item.analysis"><h4>解析</h4><p class="text-secondary mt-sm">{{ item.analysis }}</p></div>
      <div v-if="item.sourceFile" class="mt-md"><span class="text-secondary">来源文件：</span>{{ item.sourceFile.filename }}</div>
      <div class="mt-lg"><el-button type="danger" @click="del">删除此题</el-button></div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.detail-page{max-width:1000px}
.q-content{font-size:$font-size-base;line-height:1.8;white-space:pre-wrap}.q-option{padding:4px 0;color:$text-color-secondary}
</style>
