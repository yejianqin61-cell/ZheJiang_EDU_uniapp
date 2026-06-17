<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getMyBalance, createWithdrawal, getWithdrawals } from '../../../api';

const balance = ref(0);
const amount = ref('');
const submitting = ref(false);
const records = ref<any[]>([]);

onMounted(async () => {
  try {
    const [b, w] = await Promise.all([getMyBalance(), getWithdrawals(1, 20)]);
    balance.value = b.data.balance;
    records.value = w.data.list;
  } catch { /* handle */ }
});

async function handleSubmit() {
  const amt = Math.round(parseFloat(amount.value) * 100);
  if (isNaN(amt) || amt < 1000) { uni.showToast({ title: '最低提现 ¥10.00', icon: 'none' }); return; }
  if (amt > balance.value) { uni.showToast({ title: '余额不足', icon: 'none' }); return; }
  submitting.value = true;
  try {
    await createWithdrawal(amt);
    uni.showToast({ title: '提现申请已提交', icon: 'success' });
    amount.value = '';
    const w = await getWithdrawals(1, 20);
    records.value = w.data.list;
  } catch (e: any) { uni.showToast({ title: e?.message ?? '申请失败', icon: 'none' }); }
  submitting.value = false;
}

const statusLabel: Record<string, string> = { pending: '待审核', processing: '处理中', completed: '已完成', rejected: '已拒绝' };
</script>

<template>
  <view class="withdraw-page">
    <view class="balance-line">当前余额: ¥{{ (balance / 100).toFixed(2) }}</view>

    <view class="form-card">
      <text class="label">提现金额 (最低 ¥10.00)</text>
      <view class="input-row">
        <text class="prefix">¥</text>
        <input class="amount-input" type="digit" v-model="amount" placeholder="0.00" />
      </view>
      <button class="btn-submit" :loading="submitting" @tap="handleSubmit">确认提现</button>
    </view>

    <view class="section-title">提现记录</view>
    <view v-for="r in records" :key="r.id" class="record-item">
      <text class="r-amount">¥{{ (r.amount / 100).toFixed(2) }}</text>
      <text class="r-status" :class="r.status">{{ statusLabel[r.status] ?? r.status }}</text>
      <text class="r-time">{{ r.createdAt }}</text>
    </view>
    <view v-if="records.length === 0" class="empty">暂无提现记录</view>
  </view>
</template>

<style scoped>
.withdraw-page { padding: 30rpx; min-height: 100vh; background: #f5f5f5; }
.balance-line { font-size: 28rpx; color: #666; margin-bottom: 20rpx; }
.form-card { background: #fff; border-radius: 16rpx; padding: 32rpx; margin-bottom: 30rpx; }
.label { font-size: 26rpx; color: #888; display: block; margin-bottom: 16rpx; }
.input-row { display: flex; align-items: center; border-bottom: 2rpx solid #1677ff; padding-bottom: 12rpx; margin-bottom: 24rpx; }
.prefix { font-size: 40rpx; font-weight: 600; color: #333; margin-right: 8rpx; }
.amount-input { flex: 1; font-size: 40rpx; font-weight: 600; height: 60rpx; }
.btn-submit { width: 100%; height: 88rpx; line-height: 88rpx; background: #1677ff; color: #fff; border-radius: 12rpx; font-size: 30rpx; border: none; }
.section-title { font-size: 28rpx; font-weight: 600; margin-bottom: 12rpx; }
.record-item { display: flex; align-items: center; background: #fff; border-radius: 10rpx; padding: 20rpx; margin-bottom: 10rpx; }
.r-amount { font-size: 30rpx; font-weight: 500; flex: 1; }
.r-status { font-size: 24rpx; padding: 2rpx 10rpx; border-radius: 4rpx; margin: 0 16rpx; }
.r-status.pending { background: #fff7e6; color: #fa8c16; }
.r-status.completed { background: #f6ffed; color: #52c41a; }
.r-status.rejected { background: #fff2f0; color: #ff4d4f; }
.r-time { font-size: 22rpx; color: #ccc; }
.empty { text-align: center; padding: 100rpx 0; color: #999; }
</style>
