<script setup lang="ts">
import { ref, onMounted } from 'vue'; import { useRouter } from 'vue-router'; import api from '@/api/index'
const router = useRouter(); const list = ref<any[]>([]); const loading = ref(true)
onMounted(async () => { try { const d = await api.get('/contributions'); list.value = d?.list??d??[] } catch {} finally { loading.value = false } })
const stLabels: Record<string,string> = { pending_review:'待审核', approved:'已入库', rejected:'已驳回' }
</script>

<template>
  <div class="contribute-page">
    <div class="page-header flex-between"><h1 class="page-header__title">我的贡献</h1><el-button type="primary" @click="router.push('/contribute/upload')">上传题目</el-button></div>
    <el-empty v-if="!loading && list.length===0" description="暂无贡献记录" />
    <div v-for="item in list" :key="item.id" class="page-card contribute-card" @click="router.push(`/contribute/${item.id}`)">
      <div class="card-left"><span class="card-file">{{ item.filename??item.originalName??'未知文件' }}</span><span class="card-meta">{{ item.subject }} · {{ item.grade }} · {{ item.createdAt }}</span></div>
      <div class="card-right"><el-tag :type="item.status==='approved'?'success':item.status==='rejected'?'danger':'warning'" size="small">{{ stLabels[item.status]??item.status }}</el-tag><span class="arrow">›</span></div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.contribute-page{max-width:800px;margin:0 auto}
.contribute-card{display:flex;align-items:center;justify-content:space-between;margin-bottom:$spacing-sm;cursor:pointer;&:hover{box-shadow:$box-shadow}.card-left{.card-file{display:block;font-weight:500}.card-meta{font-size:$font-size-xs;color:$text-color-secondary}}.card-right{display:flex;align-items:center;gap:$spacing-sm}.arrow{color:$text-color-placeholder;font-size:20px}}
</style>
