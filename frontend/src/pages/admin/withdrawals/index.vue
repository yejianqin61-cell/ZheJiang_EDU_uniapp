<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getAdminWithdrawals, reviewWithdrawal } from '../../../api';

const withdrawals = ref<any[]>([]);
const filterStatus = ref('pending');

onMounted(async () => { await fetchData(); });

async function fetchData() {
  try {
    const res = await getAdminWithdrawals(1, 50, filterStatus.value);
    withdrawals.value = res.data.list;
  } catch { /* handle */ }
}

async function handleReview(id: string, action: 'approve' | 'reject') {
  let reason: string | undefined;
  if (action === 'reject') {
    const r = await new Promise<string | undefined>((resolve) => {
      uni.showModal({ title: '拒绝原因', content: '请输入拒绝原因（可选）', editable: true, success: (res) => resolve(res.confirm ? undefined : undefined) });
    });
  }
  try {
    await reviewWithdrawal(id, action, reason);
    uni.showToast({ title: action === 'approve' ? '已通过' : '已拒绝', icon: 'success' });
    await fetchData();
  } catch (e: any) { uni.showToast({ title: e?.message ?? '操作失败', icon: 'none' }); }
}

const statusLabel: Record<string, string> = { pending: '待审核', completed: '已完成', rejected: '已拒绝' };
</script>

<template>
  <view class="withdrawals-page">
    <view class="filter-bar">
      <text class="filter-label">筛选:</text>
      <picker :value="['pending','completed','rejected'].indexOf(filterStatus)" :range="['待审核','已完成','已拒绝']" @change="(e: any) => { filterStatus = ['pending','completed','rejected'][e.detail.value]; fetchData(); }">
        <text class="filter-value">{{ statusLabel[filterStatus] ?? filterStatus }}</text>
      </picker>
    </view>

    <view v-for="w in withdrawals" :key="w.id" class="withdrawal-card">
      <view class="w-header">
        <text class="w-user">{{ w.userName }}</text>
        <text class="w-amount">¥{{ (w.amount / 100).toFixed(2) }}</text>
      </view>
      <text class="w-meta">当前余额: ¥{{ (w.balance / 100).toFixed(2) }} | {{ w.createdAt }}</text>
      <view class="w-actions" v-if="w.status === 'pending'">
        <button class="btn-approve" @tap="handleReview(w.id, 'approve')">通过</button>
        <button class="btn-reject" @tap="handleReview(w.id, 'reject')">拒绝</button>
      </view>
      <text v-else class="w-status" :class="w.status">{{ statusLabel[w.status] ?? w.status }}</text>
    </view>
    <view v-if="withdrawals.length === 0" class="empty">暂无提现申请</view>
  </view>
</template>

<style scoped>
.withdrawals-page { padding: 20rpx 30rpx; min-height: 100vh; background: #f5f5f5; }
.filter-bar { display: flex; align-items: center; background: #fff; border-radius: 10rpx; padding: 20rpx; margin-bottom: 16rpx; }
.filter-label { font-size: 26rpx; color: #888; margin-right: 12rpx; }
.filter-value { font-size: 26rpx; color: #1677ff; }
.withdrawal-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; }
.w-header { display: flex; justify-content: space-between; align-items: center; }
.w-user { font-size: 30rpx; font-weight: 500; }
.w-amount { font-size: 36rpx; font-weight: 700; color: #ff4d4f; }
.w-meta { font-size: 24rpx; color: #999; display: block; margin: 8rpx 0; }
.w-actions { display: flex; gap: 16rpx; margin-top: 12rpx; }
.btn-approve { flex: 1; height: 64rpx; line-height: 64rpx; background: #52c41a; color: #fff; font-size: 26rpx; border-radius: 8rpx; border: none; }
.btn-reject { flex: 1; height: 64rpx; line-height: 64rpx; background: #ff4d4f; color: #fff; font-size: 26rpx; border-radius: 8rpx; border: none; }
.w-status { font-size: 24rpx; padding: 2rpx 10rpx; border-radius: 4rpx; }
.w-status.completed { background: #f6ffed; color: #52c41a; }
.w-status.rejected { background: #fff2f0; color: #ff4d4f; }
.empty { text-align: center; padding: 200rpx 0; color: #999; }
</style>
