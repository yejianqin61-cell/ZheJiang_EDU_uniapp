<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getContributionDetail } from '../../../api';

const batch = ref<any>(null);
const fileId = ref('');
const loading = ref(true);

onLoad(async (options) => {
  fileId.value = options?.fileId ?? '';
  try {
    const res = await getContributionDetail(fileId.value);
    batch.value = res.data;
  } catch { /* handle */ }
  loading.value = false;
});

const statusSection = (status: string) => (batch.value?.questions ?? []).filter((q: any) => q.status === status);
const statusLabel: Record<string, string> = { approved: '已通过', rejected: '已驳回', pending_review: '待审核', parsed: '草稿' };
const typeLabel: Record<string, string> = { single_choice: '单选题', multi_choice: '多选题', true_false: '判断题', fill_blank: '填空题', short_answer: '简答题' };
</script>

<template>
  <view class="detail" v-if="!loading && batch">
    <view class="header">
      <text class="filename">{{ batch.filename }}</text>
      <text class="meta">提交时间: {{ batch.submitStatus !== 'draft' ? '已提交' : '未提交' }}</text>
    </view>

    <view v-if="statusSection('approved').length" class="section">
      <text class="section-title approved">已通过 ({{ statusSection('approved').length }})</text>
      <view v-for="q in statusSection('approved')" :key="q.id" class="q-mini approved-bg">
        <text class="q-type">{{ typeLabel[q.type] ?? q.type }}</text>
        <text class="q-content">{{ q.content.slice(0, 40) }}...</text>
        <text class="q-cashback">+¥{{ (q.cashbackAmount / 100).toFixed(2) }}</text>
      </view>
    </view>

    <view v-if="statusSection('pending_review').length || statusSection('parsed').length" class="section">
      <text class="section-title pending">待审核 ({{ statusSection('pending_review').length + statusSection('parsed').length }})</text>
      <view v-for="q in [...statusSection('pending_review'), ...statusSection('parsed')]" :key="q.id" class="q-mini pending-bg">
        <text class="q-type">{{ typeLabel[q.type] ?? q.type }}</text>
        <text class="q-content">{{ q.content.slice(0, 40) }}...</text>
      </view>
    </view>

    <view v-if="statusSection('rejected').length" class="section">
      <text class="section-title rejected">已驳回 ({{ statusSection('rejected').length }})</text>
      <view v-for="q in statusSection('rejected')" :key="q.id" class="q-mini rejected-bg">
        <text class="q-type">{{ typeLabel[q.type] ?? q.type }}</text>
        <text class="q-content">{{ q.content.slice(0, 40) }}...</text>
      </view>
    </view>
  </view>
  <view v-else-if="loading" class="loading">加载中...</view>
</template>

<style scoped>
.detail { padding: 20rpx 30rpx; min-height: 100vh; background: #f5f5f5; }
.header { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.filename { font-size: 32rpx; font-weight: 600; display: block; }
.meta { font-size: 24rpx; color: #999; margin-top: 6rpx; display: block; }
.section { margin-bottom: 20rpx; }
.section-title { font-size: 28rpx; font-weight: 500; display: block; margin-bottom: 12rpx; }
.section-title.approved { color: #52c41a; }
.section-title.pending { color: #1677ff; }
.section-title.rejected { color: #ff4d4f; }
.q-mini { padding: 16rpx; border-radius: 8rpx; margin-bottom: 8rpx; display: flex; align-items: center; gap: 12rpx; }
.approved-bg { background: #f6ffed; }
.pending-bg { background: #f0f5ff; }
.rejected-bg { background: #fff2f0; }
.q-type { font-size: 22rpx; color: #1677ff; flex-shrink: 0; }
.q-content { font-size: 26rpx; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.q-cashback { font-size: 24rpx; color: #ff4d4f; font-weight: 500; }
.loading { text-align: center; padding: 200rpx 0; color: #999; }
</style>
