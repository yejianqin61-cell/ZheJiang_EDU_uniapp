<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getMyBalance, getBalanceLog } from '../../../api';

const balance = ref(0);
const totalEarned = ref(0);
const totalSpent = ref(0);
const logs = ref<any[]>([]);

onMounted(async () => {
  try {
    const [bRes, lRes] = await Promise.all([getMyBalance(), getBalanceLog(1, 20)]);
    balance.value = bRes.data.balance;
    totalEarned.value = bRes.data.totalEarned;
    totalSpent.value = bRes.data.totalSpent;
    logs.value = lRes.data.list;
  } catch { /* handle */ }
});

function goWithdraw() {
  uni.navigateTo({ url: '/pages/profile/withdraw/index' });
}

const typeLabel: Record<string, string> = { cashback: '返现', pay_order: '组卷支付', withdraw: '提现' };
</script>

<template>
  <view class="balance-page">
    <view class="balance-card">
      <text class="balance-num">¥{{ (balance / 100).toFixed(2) }}</text>
      <text class="balance-label">当前余额</text>
    </view>
    <view class="stat-row">
      <text>累计收入 ¥{{ (totalEarned / 100).toFixed(2) }}</text>
      <text>累计支出 ¥{{ (totalSpent / 100).toFixed(2) }}</text>
    </view>
    <button class="btn-withdraw" @tap="goWithdraw">提现</button>

    <view class="section-title">明细</view>
    <view v-for="l in logs" :key="l.id" class="log-item">
      <view class="log-left">
        <text class="log-type">{{ typeLabel[l.type] ?? l.type }}</text>
        <text class="log-note">{{ l.note }}</text>
      </view>
      <text class="log-amount" :class="l.amount >= 0 ? 'in' : 'out'">{{ l.amount >= 0 ? '+' : '' }}¥{{ (l.amount / 100).toFixed(2) }}</text>
    </view>
    <view v-if="logs.length === 0" class="empty">暂无明细</view>
  </view>
</template>

<style scoped>
.balance-page { padding: 30rpx; min-height: 100vh; background: #f5f5f5; }
.balance-card { background: linear-gradient(135deg, #1677ff, #4096ff); border-radius: 16rpx; padding: 60rpx; text-align: center; margin-bottom: 16rpx; }
.balance-num { font-size: 64rpx; font-weight: bold; color: #fff; display: block; }
.balance-label { font-size: 26rpx; color: rgba(255,255,255,0.8); margin-top: 8rpx; display: block; }
.stat-row { display: flex; justify-content: space-between; padding: 20rpx 0; font-size: 26rpx; color: #666; }
.btn-withdraw { width: 100%; height: 88rpx; line-height: 88rpx; background: #fff; color: #1677ff; border: 2rpx solid #1677ff; border-radius: 12rpx; font-size: 30rpx; margin-bottom: 30rpx; }
.section-title { font-size: 28rpx; font-weight: 600; margin-bottom: 16rpx; }
.log-item { display: flex; justify-content: space-between; align-items: center; background: #fff; border-radius: 10rpx; padding: 20rpx; margin-bottom: 10rpx; }
.log-left { flex: 1; min-width: 0; }
.log-type { font-size: 24rpx; color: #1677ff; display: block; }
.log-note { font-size: 26rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; margin-top: 4rpx; }
.log-amount { font-size: 30rpx; font-weight: 600; flex-shrink: 0; margin-left: 16rpx; }
.log-amount.in { color: #52c41a; }
.log-amount.out { color: #ff4d4f; }
.empty { text-align: center; padding: 100rpx 0; color: #999; }
</style>
