<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getMyBalance } from '@/api/modules/auth'

const summary = ref({
  balance: 0,
  totalEarned: 0,
  totalSpent: 0,
})
const loading = ref(true)

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

onMounted(async () => {
  try {
    const data = await getMyBalance()
    summary.value.balance = data?.balance ?? 0
    summary.value.totalEarned = data?.totalEarned ?? 0
    summary.value.totalSpent = data?.totalSpent ?? 0
  }
  catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '余额数据加载失败'))
  }
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
      <p class="balance-value">¥{{ (summary.balance / 100).toFixed(2) }}</p>
    </div>
    <div class="balance-stats mt-md">
      <div class="page-card stat-card">
        <p class="stat-card__label">累计收入</p>
        <p class="stat-card__value stat-card__value--positive">¥{{ (summary.totalEarned / 100).toFixed(2) }}</p>
      </div>
      <div class="page-card stat-card">
        <p class="stat-card__label">累计支出</p>
        <p class="stat-card__value">¥{{ (summary.totalSpent / 100).toFixed(2) }}</p>
      </div>
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

.balance-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $spacing-md;
}

.stat-card {
  padding: $spacing-lg;
}

.stat-card__label {
  margin-bottom: $spacing-sm;
  font-size: $font-size-sm;
  color: $text-color-secondary;
}

.stat-card__value {
  font-size: 28px;
  font-weight: 700;
  color: $text-color;
}

.stat-card__value--positive {
  color: #2e7d32;
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

@media (max-width: 768px) {
  .balance-stats {
    grid-template-columns: 1fr;
  }
}
</style>
