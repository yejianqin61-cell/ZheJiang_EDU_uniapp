<script setup lang="ts">
import { ref, onMounted } from 'vue'; import { useRouter } from 'vue-router'; import api from '@/api/index'; import { ElMessage, ElMessageBox } from 'element-plus'
const router = useRouter(); const list = ref<any[]>([]); const loading = ref(true)
const filters = ref({ subject:'', grade:'', knowledgePoint:'', difficulty:'', keyword:'' })
const pagination = ref({page:1,pageSize:20,total:0,totalPages:0})
const subjects = ['','语文','数学','英语','物理','化学','生物','政治','历史','地理']
const grades = ['','一年级','二年级','三年级','四年级','五年级','六年级','七年级','八年级','九年级','高一','高二','高三']
const diffs = [{v:'',l:'全部'},{v:'1',l:'简单'},{v:'2',l:'中等'},{v:'3',l:'困难'}]
onMounted(()=>fetchList())
async function fetchList() { loading.value=true; const p:any={...filters.value,page:pagination.value.page,pageSize:pagination.value.pageSize}; Object.keys(p).forEach(k=>{if(!p[k])delete p[k]}); try { const d=await api.get('/admin/questions',{params:p}); list.value=d?.list??d??[]; if(d?.pagination)pagination.value=d.pagination } catch {} finally { loading.value=false } }
function reset() { filters.value={subject:'',grade:'',knowledgePoint:'',difficulty:'',keyword:''}; pagination.value.page=1; fetchList() }
async function del(id:string) { try { await ElMessageBox.confirm('确认删除？','删除',{type:'warning'}); await api.delete(`/admin/questions/${id}`); ElMessage.success('已删除'); fetchList() } catch {} }
</script>

<template>
  <div>
    <div class="page-header"><h1 class="page-header__title">题库管理</h1></div>
    <div class="filter-bar">
      <el-select v-model="filters.subject" placeholder="学科" clearable @change="fetchList"><el-option v-for="s in subjects" :key="s" :label="s||'全部'" :value="s"/></el-select>
      <el-select v-model="filters.grade" placeholder="年级" clearable @change="fetchList"><el-option v-for="g in grades" :key="g" :label="g||'全部'" :value="g"/></el-select>
      <el-select v-model="filters.difficulty" placeholder="难度" clearable @change="fetchList"><el-option v-for="d in diffs" :key="d.v" :label="d.l" :value="d.v"/></el-select>
      <el-input v-model="filters.keyword" placeholder="搜索题目..." clearable @keyup.enter="fetchList" style="width:200px"/>
      <el-button type="primary" @click="fetchList">搜索</el-button>
      <el-button @click="reset">重置</el-button>
      <span class="text-secondary" style="margin-left:auto">共 {{ pagination.total }} 题</span>
    </div>
    <el-table :data="list" class="page-card" v-loading="loading">
      <el-table-column prop="type" label="题型" width="80"><template #default="{row}"><el-tag size="small">{{ row.type }}</el-tag></template></el-table-column>
      <el-table-column prop="content" label="题目内容" show-overflow-tooltip/>
      <el-table-column prop="subject" label="学科" width="70"/>
      <el-table-column prop="grade" label="年级" width="70"/>
      <el-table-column prop="difficulty" label="难度" width="70"/>
      <el-table-column label="操作" width="140"><template #default="{row}"><el-button size="small" @click="router.push(`/admin/questions/${row.id}`)">详情</el-button><el-button size="small" type="danger" @click="del(row.id)">删除</el-button></template></el-table-column>
    </el-table>
    <el-pagination v-if="pagination.totalPages>1" class="mt-md" :current-page="pagination.page" :total="pagination.total" :page-size="pagination.pageSize" @current-change="(p:number)=>{pagination.page=p;fetchList()}" layout="prev,pager,next" background/>
  </div>
</template>
