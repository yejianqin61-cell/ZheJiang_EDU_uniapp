<script setup lang="ts">
import { ref, onMounted } from 'vue'; import { useRoute, useRouter } from 'vue-router'; import api from '@/api/index'; import { ElMessage } from 'element-plus'; import { renderMarkdown } from '@/composables/useMarkdown'
const route = useRoute(); const router = useRouter(); const item = ref<any>(null); const loading = ref(true)
onMounted(async () => { try { item.value = await api.get(`/admin/reviews/${route.params.id}`) } catch {} finally { loading.value = false } })
async function approve() { try { await api.post(`/admin/reviews/${route.params.id}/approve`); ElMessage.success('已通过'); router.back() } catch(e:any) { ElMessage.error(e?.message??'操作失败') } }
async function reject() { try { await api.post(`/admin/reviews/${route.params.id}/reject`); ElMessage.success('已拒绝'); router.back() } catch(e:any) { ElMessage.error(e?.message??'操作失败') } }
</script>

<template>
  <div class="detail-page">
    <div class="breadcrumb"><router-link to="/admin/review">入库审核</router-link><span class="breadcrumb__separator">›</span><span class="breadcrumb__current">审核详情</span></div>
    <div v-if="loading" class="text-center" style="padding:80px 0"><p class="text-secondary">加载中...</p></div>
    <div v-else-if="item" class="page-card">
      <div class="q-header"><el-tag size="large">{{ item.type }}</el-tag><el-tag size="large" type="warning" class="ml-sm">难度 {{ item.difficulty }}</el-tag></div>
      <p class="q-content mt-md" v-html="renderMarkdown(item.content)"></p>
      <div v-if="item.options?.length" class="q-options mt-md"><div v-for="(o,i) in item.options" :key="i" class="q-option">{{ o }}</div></div>
      <div class="mt-lg"><h4>答案</h4><p class="text-secondary mt-sm">{{ item.answer }}</p></div>
      <div class="mt-md" v-if="item.analysis"><h4>解析</h4><p class="text-secondary mt-sm">{{ item.analysis }}</p></div>
      <div class="info-grid mt-md"><div class="info-row"><span>学科</span><span>{{ item.subject }}</span></div><div class="info-row"><span>年级</span><span>{{ item.grade }}</span></div><div class="info-row"><span>知识点</span><span>{{ item.knowledgePoint?.name??'—' }}</span></div></div>
      <div class="actions mt-lg"><el-button type="success" size="large" @click="approve">通过入库</el-button><el-button type="danger" size="large" @click="reject">拒绝</el-button></div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.detail-page{max-width:1000px}
.q-content{font-size:$font-size-base;line-height:1.8;white-space:pre-wrap}.q-option{padding:4px 0;color:$text-color-secondary}
.info-grid{.info-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f5f5f5;font-size:$font-size-sm;span:first-child{color:$text-color-secondary}&:last-child{border-bottom:none}}}
.actions{display:flex;gap:$spacing-md}
</style>
