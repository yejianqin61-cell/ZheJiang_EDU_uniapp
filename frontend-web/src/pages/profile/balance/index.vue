<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getMyBalance } from '@/api/modules/auth'

const balance = ref(0)
const loading = ref(true)

onMounted(async () => {
  try {
    const data = await getMyBalance()
    balance.value = data?.balance ?? 0
  }
  catch {}
  finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="balance-page">
    <div class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="breadcrumb__separator">›</span>
      <router-link to="/profile">个人中心</router-link>
      <span class="breadcrumb__separator">›</span>
      <span class="breadcrumb__current">我的余额</span>
    </div>
    <div class="page-card balance-card">
      <p class="balance-label">账户余额</p>
      <p class="balance-value">¥{{ (balance / 100).toFixed(2) }}</p>
    </div>
    <div class="page-card mt-md">
      <h3>余额说明</h3>
      <p class="text-secondary mt-sm">余额来源于教师贡献题目返现，可用于支付组卷费用或提现到支付宝。</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.balance-page {
  max-width: 1500px;
}

.balance-card {
  padding: $spacing-xl;
  text-align: center;
}

.balance-label {
  font-size: $font-size-sm;
  color: $text-color-secondary;
}

.balance-value {
  margin-top: $spacing-sm;
  font-size: 40px;
  font-weight: 700;
  color: $color-primary;
}
</style>
