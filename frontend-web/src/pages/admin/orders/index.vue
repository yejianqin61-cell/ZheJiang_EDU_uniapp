<script setup lang="ts">
import { ref, onMounted } from 'vue'; import { useRouter } from 'vue-router'; import api from '@/api/index'; import { ElMessage } from 'element-plus'
const router = useRouter()
const list = ref<any[]>([]); const loading = ref(true); const scope = ref<'mine'|'others'>('mine'); const tab = ref<'download'|'print'>('download')
const pagination = ref({page:1,pageSize:20,total:0,totalPages:0})
const psLabels: Record<string,string> = { null:'待处理', printing:'打印中', shipped:'已发货', delivered:'已签收' }
onMounted(()=>fetchList())
async function fetchList() { loading.value=true; try { const d=await api.get('/orders',{params:{page:pagination.value.page,pageSize:pagination.value.pageSize,scope:scope.value,type:tab.value}}); list.value=d?.list??d??[]; if(d?.pagination)pagination.value=d.pagination } catch {} finally { loading.value=false } }
function switchScope(s:string) { scope.value=s as 'mine'|'others'; pagination.value.page=1; fetchList() }
function switchTab(t:string) { tab.value=t as 'download'|'print'; pagination.value.page=1; fetchList() }
async function updateStatus(orderId:string,status:string) { try { await api.put(`/admin/orders/${orderId}/print-status`,{printStatus:status}); ElMessage.success('状态已更新'); fetchList() } catch(e:any) { ElMessage.error(e?.message??'操作失败') } }
</script>

<template>
  <div>
    <div class="page-header"><h1 class="page-header__title">订单管理</h1></div>
    <div class="filter-bar">
      <el-radio-group v-model="scope" @change="switchScope"><el-radio-button value="mine">我的订单</el-radio-button><el-radio-button value="others">所有用户订单</el-radio-button></el-radio-group>
      <el-tabs v-model="tab" @tab-change="switchTab" style="flex:1"><el-tab-pane label="下载服务" name="download"/><el-tab-pane label="打印服务" name="print"/></el-tabs>
    </div>
    <el-table :data="list" class="page-card" v-loading="loading">
      <template v-if="tab==='download'">
        <el-table-column prop="paperTitle" label="试卷名称" show-overflow-tooltip/>
        <el-table-column prop="amount" label="金额" width="100"><template #default="{row}">¥{{ (row.amount/100).toFixed(2) }}</template></el-table-column>
        <el-table-column prop="status" label="状态" width="80"><template #default="{row}"><el-tag :type="row.status==='paid'?'success':'warning'" size="small">{{ row.status==='paid'?'已支付':'待支付' }}</el-tag></template></el-table-column>
        <el-table-column prop="createdAt" label="时间" width="160"/>
      </template>
      <template v-else>
        <el-table-column prop="paperTitle" label="试卷名称" show-overflow-tooltip/>
        <el-table-column prop="copies" label="份数" width="60"/>
        <el-table-column prop="amount" label="金额" width="100"><template #default="{row}">¥{{ (row.amount/100).toFixed(2) }}</template></el-table-column>
        <el-table-column prop="printStatus" label="物流" width="80"><template #default="{row}"><el-tag :type="row.printStatus==='delivered'?'success':row.printStatus==='shipped'?'primary':row.printStatus==='printing'?'':'warning'" size="small">{{ psLabels[String(row.printStatus)]??'待处理' }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="200"><template #default="{row}"><el-button v-if="!row.printStatus" size="small" @click="updateStatus(row.orderId,'printing')">标记打印中</el-button><el-button v-if="row.printStatus==='printing'" size="small" @click="updateStatus(row.orderId,'shipped')">标记已发货</el-button><el-button v-if="row.printStatus==='shipped'" size="small" type="success" @click="updateStatus(row.orderId,'delivered')">标记已签收</el-button></template></el-table-column>
      </template>
    </el-table>
    <el-pagination v-if="pagination.totalPages>1" class="mt-md" :current-page="pagination.page" :total="pagination.total" :page-size="pagination.pageSize" @current-change="(p:number)=>{pagination.page=p;fetchList()}" layout="prev,pager,next" background/>
  </div>
</template>
