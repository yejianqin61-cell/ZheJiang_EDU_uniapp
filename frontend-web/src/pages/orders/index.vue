<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getOrderDownload, type OrderType } from '@/api/modules/order'
import { useOrderStore } from '@/stores/order'
import type { OrderItem } from '@/types'

const router = useRouter()
const store = useOrderStore()
const activeTab = ref<OrderType>('download')
const labels: Record<string, string> = {
  null: '待处理',
  printing: '打印中',
  shipped: '已发货',
  delivered: '已签收',
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message
  }

  return fallback
}

onMounted(() => fetchByTab())

async function fetchByTab() {
  store.activeTab = activeTab.value
  await store.fetchOrders(1, activeTab.value)
}

function switchTab(tab: OrderType) {
  activeTab.value = tab
  fetchByTab()
}

function handleRowClick(row: OrderItem) {
  goDetail(row.orderId)
}

function goDetail(id: string) {
  router.push(`/orders/${id}`)
}

async function handleDownload(orderId: string, event: Event) {
  event.stopPropagation()

  try {
    const data = await getOrderDownload(orderId)
    const url = data?.docxUrl ?? data?.pdfUrl ?? ''

    if (!url) {
      ElMessage.warning('暂无导出文件')
      return
    }

    window.open(url, '_blank')
  }
  catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '获取下载链接失败'))
  }
}
</script>

<template>
  <div class="orders-page">
    <div class="page-header">
      <h1 class="page-header__title">我的订单</h1>
    </div>
    <el-tabs v-model="activeTab" @tab-change="switchTab">
      <el-tab-pane label="下载服务" name="download" />
      <el-tab-pane label="打印服务" name="print" />
    </el-tabs>

    <div v-if="activeTab === 'download'">
      <el-empty v-if="store.orders.length === 0" description="还没有下载订单，去组一份试卷吧">
        <el-button type="primary" @click="router.push('/paper/config')">去组卷</el-button>
      </el-empty>
      <el-table v-else :data="store.orders" class="page-card" stripe @row-click="handleRowClick">
        <el-table-column label="类型" width="80">
          <template #default>
            <el-tag size="small" type="primary">📥 下载</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="paperTitle" label="试卷名称" show-overflow-tooltip />
        <el-table-column label="金额" width="120">
          <template #default="{ row }">¥{{ (row.amount / 100).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="时间" width="170" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'paid' ? 'success' : row.status === 'pending' ? 'warning' : 'info'" size="small">
              {{ row.status === 'paid' ? '已支付' : row.status === 'pending' ? '待支付' : '已取消' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'paid' && row.hasExport !== false"
              type="primary"
              size="small"
              text
              @click.stop="(event: Event) => handleDownload(row.orderId, event)"
            >
              下载
            </el-button>
            <span v-else class="text-secondary">—</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="activeTab === 'print'">
      <el-empty v-if="store.orders.length === 0" description="暂无打印订单" />
      <el-table v-else :data="store.orders" class="page-card" stripe @row-click="handleRowClick">
        <el-table-column label="类型" width="80">
          <template #default>
            <el-tag size="small" type="warning">🖨️ 打印</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="paperTitle" label="试卷名称" show-overflow-tooltip />
        <el-table-column label="份数" width="70">
          <template #default="{ row }">{{ row.copies || '—' }}</template>
        </el-table-column>
        <el-table-column label="金额" width="120">
          <template #default="{ row }">¥{{ (row.amount / 100).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="收件人" width="150">
          <template #default="{ row }">
            <span v-if="row.shipping">{{ row.shipping.receiverName }} {{ row.shipping.phone }}</span>
            <span v-else class="text-secondary">—</span>
          </template>
        </el-table-column>
        <el-table-column label="物流状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.printStatus === 'delivered' ? 'success' : row.printStatus === 'shipped' ? 'primary' : row.printStatus === 'printing' ? '' : 'warning'"
              size="small"
            >
              {{ labels[String(row.printStatus)] ?? '待处理' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped lang="scss">
.orders-page {
  max-width: 1500px;
}

.el-table {
  cursor: pointer;
}
</style>
