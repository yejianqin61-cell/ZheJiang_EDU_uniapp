<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/order'
import api from '@/api/index'
import { ElMessage } from 'element-plus'

const router = useRouter()
const store = useOrderStore()
const activeTab = ref<'download' | 'print'>('download')
const labels: Record<string,string> = { null:'待处理', printing:'打印中', shipped:'已发货', delivered:'已签收' }

onMounted(() => fetchByTab())
async function fetchByTab() { store.activeTab = activeTab.value; await store.fetchOrders(1, activeTab.value) }
function switchTab(t: string) { activeTab.value = t as 'download'|'print'; fetchByTab() }
function goDetail(id: string) { router.push(`/orders/${id}`) }
async function handleDownload(orderId: string, e: Event) {
  e.stopPropagation()
  try { const d = await api.get(`/orders/${orderId}/download`); const u = d?.docxUrl??d?.pdfUrl??''; if(!u){ElMessage.warning('暂无导出文件');return}; window.open(u,'_blank') } catch { ElMessage.error('获取下载链接失败') }
}
</script>

<template>
  <div class="orders-page">
    <div class="page-header"><h1 class="page-header__title">我的订单</h1></div>
    <el-tabs v-model="activeTab" @tab-change="switchTab">
      <el-tab-pane label="下载服务" name="download" />
      <el-tab-pane label="打印服务" name="print" />
    </el-tabs>
    <div v-if="activeTab==='download'">
      <el-empty v-if="store.orders.length===0" description="暂无下载订单" />
      <div v-for="o in store.orders" :key="o.orderId" class="order-card page-card" @click="goDetail(o.orderId)">
        <div class="order-left"><el-tag size="small" type="primary">📥 下载</el-tag><span class="order-title">{{ o.paperTitle }}</span><span class="order-meta">¥{{ (o.amount/100).toFixed(2) }} · {{ o.createdAt }}</span></div>
        <div class="order-right"><el-tag :type="o.status==='paid'?'success':o.status==='pending'?'warning':'info'" size="small">{{ o.status==='paid'?'已支付':o.status==='pending'?'待支付':'已取消' }}</el-tag><el-button v-if="o.status==='paid'&&o.hasExport!==false" type="primary" size="small" text @click="(e:Event)=>handleDownload(o.orderId,e)">下载</el-button></div>
      </div>
    </div>
    <div v-if="activeTab==='print'">
      <el-empty v-if="store.orders.length===0" description="暂无打印订单" />
      <div v-for="o in store.orders" :key="o.orderId" class="order-card page-card" @click="goDetail(o.orderId)">
        <div class="order-left"><el-tag size="small" type="warning">🖨️ 打印</el-tag><span class="order-title">{{ o.paperTitle }}</span><span class="order-meta">{{ o.copies?o.copies+'份 · ':'' }}¥{{ (o.amount/100).toFixed(2) }}</span><span v-if="o.shipping" class="order-addr">{{ o.shipping.receiverName }} {{ o.shipping.phone }}</span></div>
        <div class="order-right"><el-tag :type="o.printStatus==='delivered'?'success':o.printStatus==='shipped'?'primary':o.printStatus==='printing'?'':'warning'" size="small">{{ labels[String(o.printStatus)]??'待处理' }}</el-tag><span class="arrow">›</span></div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.orders-page { max-width: 800px; margin: 0 auto; }
.order-card { display: flex; align-items: center; justify-content: space-between; margin-bottom: $spacing-sm; cursor: pointer; transition: all 0.2s; &:hover { box-shadow: $box-shadow; } .order-left { display: flex; align-items: center; gap: $spacing-md; flex: 1; min-width: 0; } .order-title { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .order-meta { font-size: $font-size-xs; color: $text-color-secondary; white-space: nowrap; } .order-addr { font-size: $font-size-xs; color: $text-color-placeholder; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; } .order-right { display: flex; align-items: center; gap: $spacing-sm; flex-shrink: 0; } .arrow { font-size: 20px; color: $text-color-placeholder; } }
</style>
