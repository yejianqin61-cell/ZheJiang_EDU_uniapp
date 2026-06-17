<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getContributionDetail, submitContribution } from '../../../api';

const fileId = ref('');
const filename = ref('');
const batch = ref<any>(null);
const loading = ref(true);
const submitting = ref(false);

onLoad(async (options) => {
  fileId.value = options?.fileId ?? '';
  filename.value = decodeURIComponent(options?.filename ?? '');
  try {
    const res = await getContributionDetail(fileId.value);
    batch.value = res.data;
  } catch { uni.showToast({ title: '加载失败', icon: 'none' }); }
  loading.value = false;
});

async function handleSubmit() {
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({ title: '确认提交', content: '提交后不可修改，等待管理员审核。确定提交吗？', success: (r) => resolve(r.confirm) });
  });
  if (!confirmed) return;
  submitting.value = true;
  try {
    await submitContribution(fileId.value);
    uni.showToast({ title: '已提交审核', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 800);
  } catch (e: any) { uni.showToast({ title: e?.message ?? '提交失败', icon: 'none' }); }
  submitting.value = false;
}

const statusLabel: Record<string, string> = { parsed: '草稿', pending_review: '待审核', approved: '已通过', rejected: '已驳回' };
const typeLabel: Record<string, string> = { single_choice: '单选题', multi_choice: '多选题', true_false: '判断题', fill_blank: '填空题', short_answer: '简答题' };
</script>

<template>
  <view class="preview" v-if="!loading && batch">
    <view class="header">
      <text class="filename">{{ filename }}</text>
      <text class="meta">共 {{ batch.stats.total }} 题 | 状态: {{ statusLabel[batch.submitStatus] ?? batch.submitStatus }}</text>
    </view>

    <view v-for="q in batch.questions" :key="q.id" class="question-card">
      <view class="q-header">
        <text class="q-type">{{ typeLabel[q.type] ?? q.type }}</text>
        <text class="q-status" :class="q.status">{{ statusLabel[q.status] ?? q.status }}</text>
      </view>
      <text class="q-content">{{ q.content }}</text>
      <view v-if="q.options?.length" class="q-options">
        <text v-for="(o,i) in q.options" :key="i" class="opt">{{ o }}</text>
      </view>
      <text v-if="q.knowledgePoints?.length" class="q-kp">知识点: {{ q.knowledgePoints.join(', ') }}</text>
    </view>

    <view v-if="batch.submitStatus === 'draft'" class="submit-bar">
      <button class="btn-submit" :loading="submitting" @tap="handleSubmit">提交审核 ({{ batch.stats.total }}题)</button>
    </view>
  </view>
  <view v-else-if="loading" class="loading">加载中...</view>
</template>

<style scoped>
.preview { padding: 20rpx 30rpx 120rpx; background: #f5f5f5; min-height: 100vh; }
.header { background: #fff; border-radius: 12rpx; padding: 28rpx; margin-bottom: 20rpx; }
.filename { font-size: 32rpx; font-weight: 600; display: block; }
.meta { font-size: 24rpx; color: #999; margin-top: 8rpx; display: block; }
.question-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; }
.q-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.q-type { font-size: 22rpx; color: #1677ff; }
.q-status { font-size: 22rpx; padding: 2rpx 10rpx; border-radius: 4rpx; }
.q-status.approved { background: #f6ffed; color: #52c41a; }
.q-status.rejected { background: #fff2f0; color: #ff4d4f; }
.q-status.parsed { background: #fff7e6; color: #fa8c16; }
.q-status.pending_review { background: #e6f7ff; color: #1677ff; }
.q-content { font-size: 28rpx; line-height: 1.6; display: block; }
.q-options { margin-top: 12rpx; }
.opt { font-size: 26rpx; color: #555; display: block; padding: 4rpx 0; }
.q-answer { font-size: 24rpx; color: #52c41a; margin-top: 10rpx; display: block; }
.q-kp { font-size: 22rpx; color: #999; margin-top: 6rpx; display: block; }
.submit-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 30rpx; background: #fff; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.06); }
.btn-submit { width: 100%; height: 96rpx; line-height: 96rpx; background: #1677ff; color: #fff; border-radius: 12rpx; font-size: 32rpx; border: none; }
.loading { text-align: center; padding: 200rpx 0; color: #999; }
</style>
