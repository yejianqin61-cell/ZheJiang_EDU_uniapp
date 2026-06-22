<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getMyBalance, payByBalance } from '@/api/modules/auth'
import { payAlipay } from '@/api/modules/payment'
import { useOrderStore } from '@/stores/order'

const router = useRouter()
const route = useRoute()
const order = useOrderStore()
const paying = ref(false)
const userBalance = ref(0)
const balanceLoaded = ref(false)

const paperId = ref((route.query.paperId as string) || '')
const orderType = ref<'download' | 'print' | 'exercise'>(((route.query.type as string) || 'download') as 'download' | 'print' | 'exercise')

function hasResponse(error: unknown): error is { response: unknown } {
  return typeof error === 'object' && error !== null && 'response' in error
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

onMounted(async () => {
  try {
    const data = await getMyBalance()
    userBalance.value = data?.balance ?? 0
  }
  catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '余额加载失败'))
  }

  balanceLoaded.value = true

  if (paperId.value && !order.currentOrder) {
    try {
      await order.create(paperId.value, orderType.value)
    } catch (error: unknown) {
      if (!hasResponse(error)) {
        ElMessage.error('创建订单失败')
      }
      setTimeout(() => router.back(), 1200)
    }
  }

  if (!paperId.value && !order.currentOrder) {
    ElMessage.warning('订单信息丢失，请重新组卷')
    setTimeout(() => router.replace('/paper/config'), 1000)
  }
})

const canBalancePay = computed(() => !!order.currentOrder && userBalance.value >= order.currentOrder.amount)

async function handleBalancePay() {
  if (!order.currentOrder) {
    return
  }

  if (!canBalancePay.value) {
    ElMessage.warning('余额不足')
    return
  }

  paying.value = true

  try {
    await payByBalance(order.currentOrder.orderId)
    ElMessage.success('支付成功')
    setTimeout(() => router.replace(`/orders/${order.currentOrder!.orderId}`), 800)
  } catch (error: unknown) {
    if (!hasResponse(error)) {
      ElMessage.error('支付失败')
    }
  } finally {
    paying.value = false
  }
}

function tagType(type: 'download' | 'print' | 'exercise') {
  return type === 'print' ? 'warning' : type === 'exercise' ? 'success' : 'primary'
}

function tagLabel(type: 'download' | 'print' | 'exercise') {
  return type === 'print' ? '🖨️ 打印服务' : type === 'exercise' ? '📚 练习服务' : '📥 下载服务'
}

async function handleAlipay() {
  if (!order.currentOrder) {
    return
  }

  paying.value = true

  try {
    let payForm = order.currentOrder.payment?.payForm ?? null

    if (!payForm) {
      const payment = await payAlipay(order.currentOrder.orderId)
      payForm = payment.payForm
      order.currentOrder.payment = {
        provider: 'alipay',
        payForm,
      }
    }

    if (payForm) {
      const container = document.createElement('div')
      container.innerHTML = payForm
      document.body.appendChild(container)
      ;(container.querySelector('form') as HTMLFormElement | null)?.submit()
    } else {
      ElMessage.warning('支付宝未就绪，请稍后重试或改用余额支付')
    }
  } catch {
    ElMessage.error('支付失败')
  } finally {
    paying.value = false
  }
}
</script>

<template>
  <div v-if="order.currentOrder" class="payment-page">
    <div class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="breadcrumb__separator">›</span>
      <span class="breadcrumb__current">确认支付</span>
    </div>

    <div class="payment-layout">
      <div class="payment-left">
        <div class="order-summary page-card">
          <el-tag :type="tagType(order.currentOrder.type)" size="large">{{ tagLabel(order.currentOrder.type) }}</el-tag>
          <div class="amount">¥{{ (order.currentOrder.amount / 100).toFixed(2) }}</div>
          <p class="order-no">订单号：{{ order.currentOrder.orderNo }}</p>
        </div>
      </div>

      <div class="payment-right">
        <div class="page-card">
          <h3>余额支付</h3>
          <p class="text-secondary mb-sm">当前余额：¥{{ (userBalance / 100).toFixed(2) }}</p>
          <el-button type="warning" size="large" :disabled="!canBalancePay" :loading="paying" class="full-width" @click="handleBalancePay">
            {{ canBalancePay ? '余额支付' : '余额不足' }}
          </el-button>
        </div>
        <div class="page-card mt-md">
          <h3>支付宝支付</h3>
          <p class="text-secondary mb-sm">支持支付宝扫码或登录支付</p>
          <el-button type="primary" size="large" :loading="paying" class="full-width" @click="handleAlipay">支付宝支付</el-button>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="loading-wrap">
    <p class="text-secondary">订单加载中...</p>
  </div>
</template>

<style scoped lang="scss">
.payment-page {
  max-width: 1500px;
}

.payment-layout {
  display: flex;
  align-items: flex-start;
  gap: $spacing-lg;
}

.payment-left {
  width: 300px;
  flex-shrink: 0;
}

.payment-right {
  flex: 1;
  min-width: 0;
}

.order-summary {
  padding: $spacing-xl;
  text-align: center;

  .amount {
    margin: $spacing-lg 0 $spacing-sm;
    font-size: 48px;
    font-weight: 700;
    color: $color-accent-red;
  }

  .order-no {
    font-size: $font-size-xs;
    color: $text-color-placeholder;
  }
}

.mock-card {
  background: #fafafa;
  border: 1px dashed #bdc3c7;
}

.full-width {
  width: 100%;
}

.loading-wrap {
  padding: 80px 0;
  text-align: center;
}

@media (max-width: 640px) {
  .payment-layout {
    flex-direction: column;
  }

  .payment-left {
    width: 100%;
  }
}
</style>
