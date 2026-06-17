<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { getPendingReviews, batchReview, getFileStatus } from '../../../api';
import type { QuestionDetail } from '../../../types';

const questions = ref<QuestionDetail[]>([]);
const selected = ref<Set<string>>(new Set());
const page = ref(1);
const total = ref(0);
const fileIdFilter = ref('');
const processing = ref(false);
const processingMsg = ref('');
let pollTimer: any = null;

const allSelected = computed(() =>
  questions.value.length > 0 && selected.value.size === questions.value.length
);

onMounted(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1] as any;
  fileIdFilter.value = currentPage?.options?.fileId ?? '';
  if (fileIdFilter.value) {
    startPolling();
  } else {
    fetchList();
  }
});

onUnmounted(() => { if (pollTimer) clearInterval(pollTimer); });

function startPolling() {
  processing.value = true;
  processingMsg.value = 'AI 正在解析题目，请稍候...';
  pollTimer = setInterval(async () => {
    try {
      const fileRes: any = await getFileStatus(fileIdFilter.value);
      const status = fileRes.data?.status;
      const questionCount = fileRes.data?.questionCount ?? 0;

      if (status === 'failed') {
        stopPolling();
        processingMsg.value = '解析失败：' + (fileRes.data?.errorMsg ?? '未知错误');
        return;
      }

      if (status === 'completed') {
        // File processing done — load all questions at once
        await fetchList();
        stopPolling();
        if (questions.value.length === 0) {
          processingMsg.value = '解析完成但未检测到题目';
        }
        return;
      }

      // Still processing
      processingMsg.value = 'AI 正在解析题目，请稍候...';
    } catch { /* retry */ }
  }, 2000);

  // Timeout after 3 minutes
  setTimeout(() => {
    if (pollTimer) {
      stopPolling();
      processingMsg.value = 'AI 解析超时，请返回重试';
    }
  }, 180000);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  processing.value = false;
}

async function fetchList() {
  const res = await getPendingReviews(page.value, 50, fileIdFilter.value || undefined);
  questions.value = res.data.list ?? [];
  total.value = res.data.pagination?.total ?? 0;
}

function toggleSelect(id: string) {
  if (selected.value.has(id)) selected.value.delete(id);
  else selected.value.add(id);
  selected.value = new Set(selected.value);
}

function toggleAll() {
  if (allSelected.value) {
    selected.value = new Set();
  } else {
    selected.value = new Set(questions.value.map(q => q.id));
  }
}

async function handleReview(action: 'approve' | 'reject') {
  const ids = selected.value.size > 0 ? [...selected.value] : questions.value.map(q => q.id);
  if (ids.length === 0) return;
  await batchReview(ids, action);
  selected.value = new Set();
  fetchList();
}
</script>

<template>
  <view class="review">
    <!-- Processing state -->
    <view v-if="processing" class="processing-card">
      <view class="spinner"></view>
      <text class="processing-text">{{ processingMsg }}</text>
    </view>

    <!-- Empty state (not processing, no fileId) -->
    <view v-else-if="questions.length === 0 && !processing && !fileIdFilter" class="empty-state">
      <text>暂无待审核题目</text>
    </view>

    <!-- Question list (only when not processing) -->
    <template v-if="!processing && questions.length > 0">
      <view class="action-bar">
        <view class="select-all" @tap="toggleAll">
          <view :class="{ checked: allSelected }"></view>
          <text>全选 {{ selected.size }}/{{ questions.length }}</text>
        </view>
      </view>

      <view v-for="q in questions" :key="q.id" class="question-card">
        <view class="q-check" @tap.stop="toggleSelect(q.id)"><view :class="{ checked: selected.has(q.id) }"></view></view>
        <view class="q-body" @tap="uni.navigateTo({ url: `/pages/admin/review/detail/index?id=${q.id}` })">
          <text class="q-content">{{ q.content }}</text>
          <text class="q-diff">难度: {{ ['','简单','中等','困难'][q.difficulty] }}</text>
        </view>
      </view>

      <view class="toolbar">
        <button class="btn-approve" @tap="handleReview('approve')">通过选中</button>
        <button class="btn-reject" @tap="handleReview('reject')">拒绝选中</button>
      </view>
    </template>
  </view>
</template>

<style scoped>
.review { padding: 20rpx 30rpx; padding-bottom: 120rpx; }
.processing-card { text-align: center; padding: 120rpx 40rpx; }
.spinner { width: 64rpx; height: 64rpx; border: 4rpx solid #e0e0e0; border-top-color: #1677ff; border-radius: 50%; margin: 0 auto 24rpx; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.processing-text { font-size: 28rpx; color: #666; }
.empty-state { text-align: center; padding: 120rpx 40rpx; color: #999; font-size: 28rpx; }
.empty-state text { display: block; margin-bottom: 12rpx; }
.action-bar { display: flex; align-items: center; margin-bottom: 16rpx; padding: 0 4rpx; }
.select-all { display: flex; align-items: center; gap: 12rpx; font-size: 26rpx; color: #666; }
.select-all view { width: 36rpx; height: 36rpx; border: 2rpx solid #d9d9d9; border-radius: 50%; }
.select-all view.checked { background: #1677ff; border-color: #1677ff; }
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
