<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getPendingReviews, batchReview } from '../../../api';
import type { QuestionDetail } from '../../../types';

const questions = ref<QuestionDetail[]>([]);
const selected = ref<Set<string>>(new Set());
const page = ref(1);
const total = ref(0);

onMounted(() => { fetchList(); });

async function fetchList() {
  const res = await getPendingReviews(page.value, 20);
  questions.value = res.data.list;
  total.value = res.data.pagination.total;
}

function toggleSelect(id: string) {
  if (selected.value.has(id)) selected.value.delete(id);
  else selected.value.add(id);
  selected.value = new Set(selected.value); // trigger reactivity
}

async function handleReview(action: 'approve' | 'reject') {
  const ids = selected.value.size > 0 ? [...selected.value] : questions.value.map(q => q.id);
  await batchReview(ids, action);
  selected.value = new Set();
  fetchList();
}
</script>

<template>
  <view class="review">
    <view class="toolbar">
      <button class="btn-approve" @tap="handleReview('approve')">通过选中</button>
      <button class="btn-reject" @tap="handleReview('reject')">拒绝选中</button>
    </view>

    <view v-for="q in questions" :key="q.id" class="question-card">
      <view class="q-check" @tap.stop="toggleSelect(q.id)"><view :class="{ checked: selected.has(q.id) }"></view></view>
      <view class="q-body" @tap="uni.navigateTo({ url: `/pages/admin/review/detail/index?id=${q.id}` })">
        <text class="q-content">{{ q.content }}</text>
        <text class="q-answer">答案: {{ q.answer }}</text>
        <text class="q-diff">难度: {{ ['','简单','中等','困难'][q.difficulty] }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.review { padding: 20rpx 30rpx; padding-bottom: 100rpx; }
.toolbar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; gap: 20rpx; padding: 16rpx 30rpx; background: #fff; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.06); }
.btn-approve { flex: 1; background: #52c41a; color: #fff; border-radius: 8rpx; height: 72rpx; line-height: 72rpx; font-size: 26rpx; }
.btn-reject { flex: 1; background: #ff4d4f; color: #fff; border-radius: 8rpx; height: 72rpx; line-height: 72rpx; font-size: 26rpx; }
.question-card { display: flex; background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 16rpx; }
.q-check { width: 48rpx; padding-top: 4rpx; }
.q-check view { width: 36rpx; height: 36rpx; border: 2rpx solid #d9d9d9; border-radius: 50%; }
.q-check view.checked { background: #1677ff; border-color: #1677ff; }
.q-body { flex: 1; }
.q-content { font-size: 28rpx; display: block; margin-bottom: 12rpx; line-height: 1.5; }
.q-answer { font-size: 24rpx; color: #52c41a; display: block; margin-bottom: 4rpx; }
.q-diff { font-size: 24rpx; color: #999; }
</style>
