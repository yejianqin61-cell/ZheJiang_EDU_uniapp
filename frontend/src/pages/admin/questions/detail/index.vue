<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { getQuestionDetail, deleteQuestion } from '../../../../api';
import type { QuestionDetail } from '../../../../types';

const questionId = ref('');
const question = ref<QuestionDetail | null>(null);
const loading = ref(true);
const showAnswer = ref(false);
const typeLabels: Record<string, string> = {
  single_choice: '单选题',
  multi_choice: '多选题',
  true_false: '判断题',
  fill_blank: '填空题',
  short_answer: '解答题',
};
const diffLabels: Record<number, string> = { 1: '简单', 2: '中等', 3: '困难' };

onLoad(async (options) => {
  questionId.value = options?.id ?? '';
  if (!questionId.value) {
    uni.showToast({ title: '参数错误', icon: 'none' });
    setTimeout(() => uni.navigateBack(), 800);
    return;
  }
  await fetchDetail();
});

async function fetchDetail() {
  loading.value = true;
  try {
    const res = await getQuestionDetail(questionId.value);
    question.value = res.data;
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function handleDelete() {
  const result = await uni.showModal({ title: '删除题目', content: '确定删除该题目？删除后不可恢复。' });
  if (!result.confirm) return;
  try {
    await deleteQuestion(questionId.value);
    uni.showToast({ title: '已删除', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 800);
  } catch { /* handled */ }
}
</script>

<template>
  <view class="detail-page" v-if="question && !loading">
    <!-- Header -->
    <view class="header">
      <text class="type-tag">{{ typeLabels[question.type] ?? question.type }}</text>
      <text class="diff-tag" :class="`diff-${question.difficulty}`">{{ diffLabels[question.difficulty] ?? '?' }}</text>
      <text class="subject-tag">{{ question.subject }} · {{ question.grade }}</text>
    </view>

    <!-- Content -->
    <view class="card">
      <text class="q-content">{{ question.content }}</text>
      <view v-if="question.options?.length" class="options">
        <view v-for="(opt, i) in question.options" :key="i" class="option">{{ opt }}</view>
      </view>
    </view>

    <!-- Knowledge Points -->
    <view class="card" v-if="question.knowledgePoints?.length">
      <text class="section-title">关联知识点</text>
      <view class="kp-tags">
        <view v-for="kp in question.knowledgePoints" :key="kp.id" class="kp-tag">
          <text>{{ kp.name }}</text>
          <text class="kp-conf">匹配度: {{ ((kp.confidence ?? 1) * 100).toFixed(0) }}%</text>
        </view>
      </view>
    </view>

    <!-- Source -->
    <view class="card" v-if="question.sourceFile">
      <text class="section-title">来源文件</text>
      <text class="source-name">{{ question.sourceFile.filename }}</text>
    </view>

    <!-- Review info -->
    <view class="card meta-card" v-if="question.reviewedBy">
      <text class="meta-text">审核人: {{ question.reviewedBy.nickname ?? question.reviewedBy.id }}</text>
      <text class="meta-text">审核时间: {{ question.reviewedAt }}</text>
    </view>

    <!-- Actions -->
    <view class="actions">
      <button class="btn-delete" @tap="handleDelete">删除题目</button>
    </view>
  </view>

  <view v-else class="loading-state">
    <text>{{ loading ? '加载中...' : '题目不存在' }}</text>
  </view>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  padding: 20rpx 30rpx 80rpx;
  background: #f5f5f5;
}

.header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 0;
  margin-bottom: 16rpx;
}

.type-tag {
  font-size: 24rpx;
  padding: 4rpx 14rpx;
  border-radius: 4rpx;
  background: #e6f4ff;
  color: #1677ff;
}

.diff-tag {
  font-size: 24rpx;
  padding: 4rpx 14rpx;
  border-radius: 4rpx;
}

.diff-1 { background: #f6ffed; color: #52c41a; }
.diff-2 { background: #fff7e6; color: #fa8c16; }
.diff-3 { background: #fff2f0; color: #ff4d4f; }

.subject-tag {
  font-size: 24rpx;
  color: #999;
  margin-left: auto;
}

.card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.q-content {
  font-size: 30rpx;
  line-height: 1.7;
  color: #1a1a1a;
  white-space: pre-wrap;
}

.options {
  margin-top: 20rpx;
}

.option {
  padding: 8rpx 0;
  font-size: 28rpx;
  color: #444;
}

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-label {
  font-size: 28rpx;
  font-weight: 500;
}

.toggle-arrow {
  font-size: 24rpx;
  color: #999;
  transition: transform 0.2s;
}

.toggle-arrow.open {
  transform: rotate(180deg);
}

.answer-section {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.answer-row {
  margin-bottom: 12rpx;
}

.a-label {
  font-size: 24rpx;
  color: #1677ff;
  margin-right: 16rpx;
}

.a-value {
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
}

.section-title {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  margin-bottom: 16rpx;
  color: #666;
}

.kp-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.kp-tag {
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 10rpx 16rpx;
  font-size: 24rpx;
  color: #333;
}

.kp-conf {
  display: block;
  font-size: 20rpx;
  color: #999;
  margin-top: 4rpx;
}

.source-name {
  font-size: 26rpx;
  color: #333;
}

.meta-card {
  padding: 20rpx 24rpx;
}

.meta-text {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 6rpx;
}

.actions {
  margin-top: 20rpx;
}

.btn-delete {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background: #fff;
  color: #ff4d4f;
  border: 1rpx solid #ff4d4f;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.loading-state {
  text-align: center;
  padding: 200rpx 40rpx;
  color: #999;
  font-size: 28rpx;
}
</style>
