<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getOrder, getOrderDownload } from '@/api/modules/order'
import { exportDocx } from '@/api/modules/paper'
import type { OrderDetail } from '@/types'

const route = useRoute()
const router = useRouter()
const order = ref<OrderDetail | null>(null)
const loading = ref(true)
const exporting = ref(false)
const PRINT_FLOW = ['printing', 'shipped', 'delivered']
const psLabels: Record<string, string> = {
  null: '待处理',
  printing: '打印中',
  shipped: '已发货',
  delivered: '已签收',
}
const stLabels: Record<string, string> = {
  paid: '已支付',
  pending: '待支付',
  cancelled: '已取消',
}

onMounted(async () => {
  const id = route.params.id as string | undefined
  if (!id) {
    router.back()
    return
  }

  try {
    order.value = await getOrder(id)
  }
  catch {
    ElMessage.error('订单加载失败')
  }
  finally {
    loading.value = false
  }
})

async function handleExport() {
  if (!order.value || exporting.value) {
    return
  }

  exporting.value = true

  try {
    if (order.value.type === 'exercise') {
      const data = await getOrderDownload(order.value.orderId)
      const downloadUrl = data?.docxUrl ?? data?.pdfUrl ?? ''

      if (!downloadUrl) {
        ElMessage.warning('暂无下载文件')
        return
      }

      window.open(downloadUrl, '_blank')
      ElMessage.success('开始下载')
      return
    }

    ElMessage.info('正在生成试卷...')
    const data = await exportDocx(order.value.paperId)
    const downloadUrl = data?.downloadUrl ?? ''

    ElMessage.success('导出成功')
    if (downloadUrl) {
      window.open(downloadUrl, '_blank')
    }
  }
  catch {
    ElMessage.error('导出失败')
  }
  finally {
    exporting.value = false
  }
}

function getStep(): number {
  if (!order.value?.printStatus) {
    return -1
  }

  return PRINT_FLOW.indexOf(order.value.printStatus)
}
</script>

<template>
  <div v-if="!loading && order" class="detail-page">
    <div class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="breadcrumb__separator">›</span>
      <router-link to="/orders">我的订单</router-link>
      <span class="breadcrumb__separator">›</span>
      <span class="breadcrumb__current">订单详情</span>
    </div>

    <template v-if="order.type !== 'print'">
      <div class="detail-body">
        <div class="detail-main">
          <div class="page-card">
            <el-tag type="primary" size="large">📥 下载服务</el-tag>
            <h2 class="mt-md">{{ order.paperTitle }}</h2>
            <div class="info-grid mt-md">
              <div class="info-row"><span>订单号</span><span>{{ order.orderNo }}</span></div>
              <div class="info-row"><span>金额</span><span class="amount">¥{{ (order.amount / 100).toFixed(2) }}</span></div>
              <div class="info-row"><span>状态</span><el-tag :type="order.status === 'paid' ? 'success' : 'warning'" size="small">{{ stLabels[order.status] ?? order.status }}</el-tag></div>
              <div class="info-row"><span>创建时间</span><span>{{ order.createdAt }}</span></div>
              <div v-if="order.paidAt" class="info-row"><span>支付时间</span><span>{{ order.paidAt }}</span></div>
            </div>
          </div>
          <div v-if="order.status === 'paid'" class="actions mt-md">
            <el-button type="primary" size="large" :loading="exporting" @click="handleExport">下载试卷</el-button>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="detail-body">
        <div class="detail-main">
          <div class="page-card">
            <el-tag type="warning" size="large">🖨️ 打印服务</el-tag>
            <h2 class="mt-md">{{ order.paperTitle }}</h2>
            <div class="info-grid mt-md">
              <div class="info-row"><span>订单号</span><span>{{ order.orderNo }}</span></div>
              <div class="info-row"><span>金额</span><span class="amount">¥{{ (order.amount / 100).toFixed(2) }}</span></div>
              <div class="info-row"><span>份数</span><span>{{ order.copies ?? '—' }} 份</span></div>
              <div class="info-row"><span>创建时间</span><span>{{ order.createdAt }}</span></div>
            </div>
          </div>
          <div v-if="order.shipping" class="page-card mt-md">
            <h3>收货地址</h3>
            <div class="shipping-info mt-sm">
              <p class="ship-name">{{ order.shipping.receiverName }} · {{ order.shipping.phone }}</p>
              <p class="ship-addr">{{ order.shipping.fullAddress }}</p>
            </div>
          </div>
        </div>
        <div class="detail-side">
          <div class="page-card">
            <h3>物流状态</h3>
            <el-timeline class="mt-md">
              <el-timeline-item
                v-for="(status, index) in PRINT_FLOW"
                :key="status"
                :timestamp="order.printStatusLog?.find(item => item.status === status)?.time"
                :type="getStep() >= index ? 'primary' : 'info'"
              >
                {{ psLabels[status] }}
              </el-timeline-item>
            </el-timeline>
            <el-timeline v-if="!order.printStatus" class="mt-md">
              <el-timeline-item type="warning">待处理 — 等待管理员处理</el-timeline-item>
            </el-timeline>
          </div>
        </div>
      </div>
    </template>
  </div>
  <div v-else-if="loading" class="loading-wrap">
    <p class="text-secondary">加载中...</p>
  </div>
</template>

<style scoped lang="scss">
.detail-page {
  max-width: 1500px;
}

.detail-body {
  display: flex;
  align-items: flex-start;
  gap: $spacing-lg;
}

.detail-main {
  flex: 1;
  min-width: 0;
}

.detail-side {
  width: 360px;
  flex-shrink: 0;
}

.info-grid {
  .info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    font-size: $font-size-sm;
    border-bottom: 1px solid #f5f5f5;

    span:first-child {
      color: $text-color-secondary;
    }

    &:last-child {
      border-bottom: none;
    }
  }

  .amount {
    font-weight: 600;
    color: $color-accent-red;
  }
}

.actions {
  padding: $spacing-lg 0;
  text-align: center;
}

.shipping-info {
  .ship-name {
    font-size: $font-size-base;
    font-weight: 500;
  }

  .ship-addr {
    margin-top: 4px;
    font-size: $font-size-sm;
    color: $text-color-secondary;
  }
}

.loading-wrap {
  padding: 80px 0;
  text-align: center;
}

@media (max-width: 768px) {
  .detail-body {
    flex-direction: column;
  }

  .detail-side {
    width: 100%;
  }
}
</style>
