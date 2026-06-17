<script setup lang="ts">
import { ref, onMounted } from 'vue'; import { useRouter } from 'vue-router'; import api from '@/api/index'; import { ElMessage, ElMessageBox } from 'element-plus'
const router = useRouter(); const list = ref<any[]>([]); const loading = ref(true); const selected = ref<string[]>([])
const pagination = ref({page:1,pageSize:20,total:0,totalPages:0})
onMounted(()=>fetchList())
async function fetchList() { loading.value=true; try { const d=await api.get('/admin/reviews',{params:{page:pagination.value.page,pageSize:pagination.value.pageSize}}); list.value=d?.list??d??[]; if(d?.pagination)pagination.value=d.pagination } catch {} finally { loading.value=false; selected.value=[] } }
function toggleAll() { if(selected.value.length===list.value.length) selected.value=[]; else selected.value=list.value.map((i:any)=>i.id) }
async function batchAction(action:string) { if(!selected.value.length){ElMessage.warning('请先选择题目');return}
  try { await ElMessageBox.confirm(`确认${action==='approve'?'通过':'拒绝'}选中的 ${selected.value.length} 道题目？`,'批量操作',{type:'warning'}); await api.post('/admin/reviews/batch',{questionIds:selected.value,action}); ElMessage.success('操作成功'); fetchList() } catch {} }
async function singleAction(id:string,action:string) { try { if(action==='approve')await api.post(`/admin/reviews/${id}/approve`); else await api.post(`/admin/reviews/${id}/reject`); ElMessage.success('操作成功'); fetchList() } catch(e:any) { ElMessage.error(e?.message??'操作失败') } }
</script>

<template>
  <div>
    <div class="page-header"><h1 class="page-header__title">入库审核</h1></div>
    <div class="filter-bar"><el-button @click="toggleAll">{{ selected.length===list.length?'取消全选':'全选' }}</el-button><el-button type="success" @click="batchAction('approve')">批量通过</el-button><el-button type="danger" @click="batchAction('reject')">批量拒绝</el-button></div>
    <el-table :data="list" @selection-change="(v:any)=>selected=v.map((i:any)=>i.id)" ref="table" class="page-card" v-loading="loading">
      <el-table-column type="selection" width="40"/>
      <el-table-column prop="type" label="题型" width="80"><template #default="{row}"><el-tag size="small">{{ row.type }}</el-tag></template></el-table-column>
      <el-table-column prop="content" label="题目内容" show-overflow-tooltip/>
      <el-table-column prop="subject" label="学科" width="70"/>
      <el-table-column prop="grade" label="年级" width="70"/>
      <el-table-column prop="difficulty" label="难度" width="70"/>
      <el-table-column label="操作" width="160"><template #default="{row}"><el-button size="small" @click="router.push(`/admin/review/${row.id}`)">详情</el-button><el-button size="small" type="success" @click="singleAction(row.id,'approve')">通过</el-button><el-button size="small" type="danger" @click="singleAction(row.id,'reject')">拒绝</el-button></template></el-table-column>
    </el-table>
    <el-pagination v-if="pagination.totalPages>1" class="mt-md" :current-page="pagination.page" :total="pagination.total" :page-size="pagination.pageSize" @current-change="(p:number)=>{pagination.page=p;fetchList()}" layout="prev,pager,next" background/>
  </div>
</template>
