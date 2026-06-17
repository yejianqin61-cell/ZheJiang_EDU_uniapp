<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getContributions } from '../../api';

const batches = ref<any[]>([]);

onMounted(async () => {
  try {
    const res = await getContributions(1, 50);
    batches.value = res.data.list;
  } catch { /* handle */ }
});

const statusLabel: Record<string, string> = { draft: '草稿', pending_review: '已提交', reviewed: '审核完成' };

function goDetail(fileId: string) {
  uni.navigateTo({ url: `/pages/contribute/detail/index?fileId=${fileId}` });
}
</script>

<template>
  <view class="contribute">
    <view v-if="batches.length === 0" class="empty">暂无贡献记录</view>
    <view v-for="b in batches" :key="b.fileId" class="batch-card" @tap="goDetail(b.fileId)">
      <text class="batch-name">{{ b.subject }} · {{ b.grade }}</text>
      <text class="batch-meta">{{ b.totalQuestions }}题 | {{ statusLabel[b.submitStatus] ?? b.submitStatus }}</text>
      <view class="batch-stats">
        <text class="stat approved">通过 {{ b.approvedCount }}</text>
        <text class="stat rejected">驳回 {{ b.rejectedCount }}</text>
        <text class="stat pending">待审 {{ b.pendingCount }}</text>
      </view>
      <view class="batch-footer">
        <text class="batch-status" :class="b.submitStatus">{{ statusLabel[b.submitStatus] ?? b.submitStatus }}</text>
        <text class="batch-cashback" v-if="b.cashbackEarned > 0">返现 +¥{{ (b.cashbackEarned / 100).toFixed(2) }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.contribute { padding: 20rpx 30rpx; min-height: 100vh; background: #f5f5f5; }
.empty { text-align: center; padding: 200rpx 0; color: #999; font-size: 28rpx; }
.batch-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; }
.batch-name { font-size: 30rpx; font-weight: 500; display: block; margin-bottom: 6rpx; }
.batch-meta { font-size: 24rpx; color: #999; display: block; }
.batch-stats { display: flex; gap: 24rpx; margin: 12rpx 0; }
.stat { font-size: 24rpx; }
.stat.approved { color: #52c41a; }
.stat.rejected { color: #ff4d4f; }
.stat.pending { color: #fa8c16; }
.batch-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8rpx; }
.batch-status { font-size: 22rpx; padding: 2rpx 10rpx; border-radius: 4rpx; }
.batch-status.draft { background: #fff7e6; color: #fa8c16; }
.batch-status.pending_review { background: #e6f7ff; color: #1677ff; }
.batch-status.reviewed { background: #f6ffed; color: #52c41a; }
.batch-cashback { font-size: 26rpx; color: #ff4d4f; font-weight: 500; }
</style>
