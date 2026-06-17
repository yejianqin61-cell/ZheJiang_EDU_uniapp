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
const orderType = ref<'download' | 'print' | 'exercise'>(((route.query.type as string) || 'download') as 'download' | 'print' | 'exercise')

onMounted(async () => {
  try { const d = await api.get('/users/me/balance'); userBalance.value = d?.balance ?? 0 } catch { /* */ }
  balanceLoaded.value = true

  // 打印流程：订单已在 checkout 页创建，直接复用
  // 下载流程：在此创建订单
  if (paperId.value && !order.currentOrder) {
    try {
      await order.create(paperId.value, orderType.value)
    } catch (e: any) {
      if (!e.response) ElMessage.error('创建订单失败')
      setTimeout(() => router.back(), 1200)
    }
  }

  // 既无 paperId 也无已有订单 → 异常
  if (!paperId.value && !order.currentOrder) {
    ElMessage.warning('订单信息丢失，请重新组卷')
    setTimeout(() => router.replace('/paper/config'), 1000)
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
  } catch (e: any) { if (!e.response) ElMessage.error('支付失败') } finally { paying.value = false }
}

async function handleMockPay() {
  if (!order.currentOrder) return
  paying.value = true
  try {
    await api.post(`/orders/${order.currentOrder.orderId}/mock-pay`)
    ElMessage.success('Mock 支付成功（开发模式）')
    setTimeout(() => router.replace(`/orders/${order.currentOrder!.orderId}`), 800)
  } catch (e: any) { if (!e.response) ElMessage.error('Mock支付失败') } finally { paying.value = false }
}

async function handleAlipay() {
  if (!order.currentOrder) return
  paying.value = true
  try {
    const p = order.currentOrder.payment
    if (p?.payForm) {
      const div = document.createElement('div'); div.innerHTML = p.payForm
      document.body.appendChild(div); (div.querySelector('form') as HTMLFormElement)?.submit()
    } else { ElMessage.warning('支付宝未配置，请使用余额或 Mock 支付') }
  } catch { ElMessage.error('支付失败') } finally { paying.value = false }
}
</script>

<template>
  <div class="payment-page" v-if="order.currentOrder">
    <div class="breadcrumb"><router-link to="/">首页</router-link><span class="breadcrumb__separator">›</span><span class="breadcrumb__current">确认支付</span></div>

    <div class="payment-layout">
      <!-- 左侧：订单摘要 -->
      <div class="payment-left">
        <div class="order-summary page-card">
          <el-tag :type="order.currentOrder.type==='print'?'warning':order.currentOrder.type==='exercise'?'success':'primary'" size="large">{{ order.currentOrder.type==='print'?'🖨️ 打印服务':order.currentOrder.type==='exercise'?'📚 练习服务':'📥 下载服务' }}</el-tag>
          <div class="amount">¥{{ (order.currentOrder.amount/100).toFixed(2) }}</div>
          <p class="order-no">订单号：{{ order.currentOrder.orderNo }}</p>
        </div>
      </div>

      <!-- 右侧：支付方式 -->
      <div class="payment-right">
        <div class="page-card">
          <h3>余额支付</h3>
          <p class="text-secondary mb-sm">当前余额：¥{{ (userBalance/100).toFixed(2) }}</p>
          <el-button type="warning" size="large" :disabled="!canBalancePay" :loading="paying" @click="handleBalancePay" style="width:100%">{{ canBalancePay?'余额支付':'余额不足' }}</el-button>
        </div>
        <div class="page-card mt-md">
          <h3>支付宝支付</h3>
          <p class="text-secondary mb-sm">支持支付宝扫码或登录支付</p>
          <el-button type="primary" size="large" :loading="paying" @click="handleAlipay" style="width:100%">支付宝支付</el-button>
        </div>
        <div class="page-card mt-md mock-card">
          <h3>🧪 开发测试</h3>
          <p class="text-secondary mb-sm">跳过真实支付，直接标记已支付（仅开发环境）</p>
          <el-button type="success" size="large" :loading="paying" @click="handleMockPay" style="width:100%">Mock 支付（测试用）</el-button>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="text-center" style="padding:80px 0"><p class="text-secondary">订单加载中...</p></div>
</template>

<style scoped lang="scss">
.payment-page { max-width: 1500px; }
.payment-layout { display: flex; gap: $spacing-lg; align-items: flex-start; }
.payment-left { width: 300px; flex-shrink: 0; }
.payment-right { flex: 1; min-width: 0; }
.order-summary { text-align: center; padding: $spacing-xl; .amount { font-size: 48px; font-weight: 700; color: $color-accent-red; margin: $spacing-lg 0 $spacing-sm; } .order-no { font-size: $font-size-xs; color: $text-color-placeholder; } }
.mock-card { border: 1px dashed #bdc3c7; background: #fafafa; }
@media (max-width: 640px) { .payment-layout { flex-direction: column; } .payment-left { width: 100%; } }
</style>
