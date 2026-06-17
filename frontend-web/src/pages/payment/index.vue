<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useOrderStore } from '@/stores/order'
import api from '@/api/index'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const order = useOrderStore()
const paying = ref(false)
const userBalance = ref(0)
const balanceLoaded = ref(false)

const paperId = ref((route.query.paperId as string) || '')
const orderType = ref<'download' | 'print'>(((route.query.type as string) || 'download') as 'download' | 'print')

onMounted(async () => {
  try { const d = await api.get('/users/me/balance'); userBalance.value = d?.balance ?? 0 } catch { /* */ }
  balanceLoaded.value = true
  if (paperId.value && !order.currentOrder) {
    try { await order.create(paperId.value, orderType.value) } catch (e: any) { ElMessage.error(e?.message ?? '创建订单失败'); setTimeout(() => router.back(), 1000) }
  }
})

const canBalancePay = computed(() => order.currentOrder && userBalance.value >= order.currentOrder.amount)

async function handleBalancePay() {
  if (!order.currentOrder) return
  if (!canBalancePay.value) { ElMessage.warning('余额不足'); return }
  paying.value = true
  try {
    await api.post(`/orders/${order.currentOrder.orderId}/balance-pay`)
    ElMessage.success('支付成功')
    setTimeout(() => router.replace(`/orders/${order.currentOrder!.orderId}`), 800)
  } catch (e: any) { ElMessage.error(e?.message ?? '支付失败') } finally { paying.value = false }
}

async function handleAlipay() {
  if (!order.currentOrder) return
  paying.value = true
  try {
    const p = order.currentOrder.payment
    if (p?.payForm) {
      const div = document.createElement('div'); div.innerHTML = p.payForm
      document.body.appendChild(div); (div.querySelector('form') as HTMLFormElement)?.submit()
    } else { ElMessage.warning('暂不支持支付') }
  } catch { ElMessage.error('支付失败') } finally { paying.value = false }
}
</script>

<template>
  <div class="payment-page" v-if="order.currentOrder">
    <div class="breadcrumb"><router-link to="/">首页</router-link><span class="breadcrumb__separator">›</span><span class="breadcrumb__current">确认支付</span></div>
    <div class="order-summary page-card">
      <el-tag :type="order.currentOrder.type==='print'?'warning':'primary'" size="large">{{ order.currentOrder.type==='print'?'🖨️ 打印服务':'📥 下载服务' }}</el-tag>
      <div class="amount">¥{{ (order.currentOrder.amount/100).toFixed(2) }}</div>
      <p class="order-no">订单号：{{ order.currentOrder.orderNo }}</p>
    </div>
    <div class="page-card mt-md">
      <h3>余额支付</h3>
      <p class="text-secondary mb-sm">当前余额：¥{{ (userBalance/100).toFixed(2) }}</p>
      <el-button type="warning" size="large" :disabled="!canBalancePay" :loading="paying" @click="handleBalancePay" style="width:100%">{{ canBalancePay?'余额支付':'余额不足' }}</el-button>
    </div>
    <div class="page-card mt-md">
      <h3>支付宝支付</h3>
      <p class="text-secondary mb-sm">支持支付宝扫码或登录支付</p>
      <el-button type="primary" size="large" :loading="paying" @click="handleAlipay" style="width:100%">支付宝支付</el-button>
    </div>
  </div>
  <div v-else class="text-center" style="padding:80px 0"><p class="text-secondary">订单加载中...</p></div>
</template>

<style scoped lang="scss">
.payment-page { max-width: 500px; margin: 0 auto; }
.order-summary { text-align: center; padding: $spacing-xl; .amount { font-size: 48px; font-weight: 700; color: $color-danger; margin: $spacing-lg 0 $spacing-sm; } .order-no { font-size: $font-size-xs; color: $text-color-placeholder; } }
</style>
