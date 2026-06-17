<script setup lang="ts">
import { ref, onMounted } from 'vue'; import api from '@/api/index'; import { ElMessage, ElMessageBox } from 'element-plus'
const list = ref<any[]>([]); const loading = ref(true)
const pagination = ref({page:1,pageSize:20,total:0,totalPages:0})
onMounted(()=>fetchList())
async function fetchList() { loading.value=true; try { const d=await api.get('/admin/withdrawals',{params:pagination.value}); list.value=d?.list??d??[]; if(d?.pagination)pagination.value=d.pagination } catch {} finally { loading.value=false } }
async function approve(id:string) { try { await api.put(`/admin/withdrawals/${id}`, { action: 'approve' }); ElMessage.success('已通过'); fetchList() } catch(e:any) { ElMessage.error(e?.message??'操作失败') } }
async function reject(id:string) { try { const {value:reason}=await ElMessageBox.prompt('请输入拒绝原因','拒绝提现',{type:'warning'}); if(reason) { await api.put(`/admin/withdrawals/${id}`,{action:'reject', rejectReason: reason}); ElMessage.success('已拒绝'); fetchList() } } catch {} }
</script>

<template>
  <div>
    <div class="page-header"><h1 class="page-header__title">提现管理</h1></div>
    <el-table :data="list" class="page-card" v-loading="loading">
      <el-table-column prop="userPhone" label="用户" width="130"/>
      <el-table-column prop="amount" label="金额" width="100"><template #default="{row}">¥{{ (row.amount/100).toFixed(2) }}</template></el-table-column>
      <el-table-column prop="status" label="状态" width="100"><template #default="{row}"><el-tag :type="row.status==='approved'?'success':row.status==='rejected'?'danger':'warning'" size="small">{{ row.status==='approved'?'已通过':row.status==='rejected'?'已拒绝':'待审核' }}</el-tag></template></el-table-column>
      <el-table-column prop="createdAt" label="申请时间" width="160"/>
      <el-table-column label="操作" width="180"><template #default="{row}"><template v-if="row.status==='pending'"><el-button size="small" type="success" @click="approve(row.id)">通过</el-button><el-button size="small" type="danger" @click="reject(row.id)">拒绝</el-button></template><template v-else><span class="text-secondary">—</span></template></template></el-table-column>
    </el-table>
    <el-pagination v-if="pagination.totalPages>1" class="mt-md" :current-page="pagination.page" :total="pagination.total" :page-size="pagination.pageSize" @current-change="(p:number)=>{pagination.page=p;fetchList()}" layout="prev,pager,next" background/>
  </div>
</template>
