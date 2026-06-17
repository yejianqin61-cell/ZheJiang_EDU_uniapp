<script setup lang="ts">
import { ref, onMounted } from 'vue'; import api from '@/api/index'
const list = ref<any[]>([]); const loading = ref(true)
const filters = ref({ subject:'', grade:'' })
const subjects = ['','语文','数学','英语','物理','化学','生物','政治','历史','地理','科学']
const grades = ['','一年级','二年级','三年级','四年级','五年级','六年级','七年级','八年级','九年级','高一','高二','高三']
const pagination = ref({page:1,pageSize:20,total:0,totalPages:0})
onMounted(()=>fetchList())
async function fetchList() { loading.value=true; const p:any={...filters.value,page:pagination.value.page,pageSize:pagination.value.pageSize}; Object.keys(p).forEach(k=>{if(!p[k])delete p[k]}); try { const d=await api.get('/admin/knowledge-points',{params:p}); list.value=d?.list??d??[]; if(d?.pagination)pagination.value=d.pagination } catch {} finally { loading.value=false } }
</script>

<template>
  <div>
    <div class="page-header"><h1 class="page-header__title">知识点中心</h1></div>
    <div class="filter-bar">
      <el-select v-model="filters.subject" placeholder="学科" clearable @change="fetchList"><el-option v-for="s in subjects" :key="s" :label="s||'全部'" :value="s"/></el-select>
      <el-select v-model="filters.grade" placeholder="年级" clearable @change="fetchList"><el-option v-for="g in grades" :key="g" :label="g||'全部'" :value="g"/></el-select>
      <el-button type="primary" @click="fetchList">筛选</el-button>
      <span class="text-secondary" style="margin-left:auto">共 {{ pagination.total }} 个知识点</span>
    </div>
    <el-table :data="list" class="page-card" v-loading="loading" stripe>
      <el-table-column prop="name" label="知识点名称"/>
      <el-table-column prop="subject" label="学科" width="80"/>
      <el-table-column prop="grade" label="年级" width="80"/>
      <el-table-column prop="questionCount" label="关联题目数" width="100"/>
    </el-table>
    <el-pagination v-if="pagination.totalPages>1" class="mt-md" :current-page="pagination.page" :total="pagination.total" :page-size="pagination.pageSize" @current-change="(p:number)=>{pagination.page=p;fetchList()}" layout="total, prev, pager, next" background/>
  </div>
</template>
