<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getQuestionDetail, batchReview } from '../../../../api';

interface QuestionDetail {
  id: string;
  type: string;
  content: string;
  options: string[] | null;
  answer: string;
  analysis: string | null;
  difficulty: number;
  subject: string;
  grade: string;
  status: string;
  knowledgePoints?: { id: string; name: string; confidence: number }[];
}

const question = ref<QuestionDetail | null>(null);
const loading = ref(true);
const reviewing = ref(false);

const typeLabels: Record<string, string> = {
  single_choice: '单选题', multi_choice: '多选题',
  true_false: '判断题', fill_blank: '填空题', short_answer: '解答题',
};
const diffLabels: Record<number, string> = { 1: '简单', 2: '中等', 3: '困难' };

onMounted(async () => {
  // Get questionId from route params
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  const id = page?.options?.id;
  if (id) {
    const res = await getQuestionDetail(id);
    question.value = res.data;
  }
  loading.value = false;
});

async function handleReview(action: 'approve' | 'reject') {
  if (!question.value) return;
  reviewing.value = true;
  try {
    await batchReview([question.value.id], action);
    uni.showToast({ title: action === 'approve' ? '已通过' : '已拒绝', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 600);
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' });
  } finally {
    reviewing.value = false;
  }
}
</script>

<template>
  <view class="page">
    <view v-if="loading" class="loading">加载中...</view>

    <view v-else-if="question" class="detail">
      <view class="status-bar" :class="question.status">
        {{ question.status === 'parsed' ? '待审核' : question.status === 'approved' ? '已通过' : '已拒绝' }}
      </view>

      <view class="card">
        <view class="meta-row">
          <text class="meta-tag">{{ typeLabels[question.type] ?? question.type }}</text>
          <text class="meta-tag">{{ diffLabels[question.difficulty] ?? '?' }}</text>
          <text class="meta-tag">{{ question.subject }} · {{ question.grade }}</text>
        </view>

        <text class="q-content">{{ question.content }}</text>

        <view v-if="question.options?.length" class="q-options">
          <view v-for="(opt, i) in question.options" :key="i" class="q-option">{{ opt }}</view>
        </view>
      </view>

      <view class="card">
        <text class="section-title">AI 识别答案</text>
        <text class="answer-text">{{ question.answer || '(未识别)' }}</text>
      </view>

      <view class="card" v-if="question.analysis">
        <text class="section-title">AI 识别解析</text>
        <text class="analysis-text">{{ question.analysis }}</text>
      </view>

      <view class="card" v-if="question.knowledgePoints?.length">
        <text class="section-title">AI 识别知识点</text>
        <view class="kp-tags">
          <view v-for="kp in question.knowledgePoints" :key="kp.id" class="kp-tag">
            {{ kp.name }} ({{ ((kp.confidence ?? 0) * 100).toFixed(0) }}%)
          </view>
        </view>
      </view>

      <view v-if="question.status === 'parsed'" class="actions">
        <button class="btn-approve" :loading="reviewing" @tap="handleReview('approve')">通过</button>
        <button class="btn-reject" :loading="reviewing" @tap="handleReview('reject')">拒绝</button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 20rpx 30rpx; padding-bottom: 120rpx; }
.loading { text-align: center; padding: 80rpx 0; color: #999; }
.status-bar { text-align: center; padding: 16rpx; border-radius: 12rpx; margin-bottom: 20rpx; font-size: 28rpx; }
.status-bar.parsed { background: #fff7e6; color: #fa8c16; }
.status-bar.approved { background: #e6f7e9; color: #52c41a; }
.status-bar.rejected { background: #fff0f0; color: #ff4d4f; }
.card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; }
.meta-row { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.meta-tag { font-size: 22rpx; background: #f0f0f0; padding: 4rpx 16rpx; border-radius: 8rpx; color: #666; }
.q-content { font-size: 30rpx; line-height: 1.7; }
.q-options { margin-top: 16rpx; }
.q-option { font-size: 28rpx; color: #555; padding: 8rpx 0; }
.section-title { font-size: 26rpx; font-weight: 500; color: #333; margin-bottom: 12rpx; display: block; }
.answer-text { font-size: 30rpx; color: #52c41a; font-weight: 500; }
.analysis-text { font-size: 28rpx; color: #555; line-height: 1.6; }
.kp-tags { display: flex; flex-wrap: wrap; gap: 12rpx; }
.kp-tag { font-size: 24rpx; background: #e6f0ff; color: #1677ff; padding: 8rpx 16rpx; border-radius: 8rpx; }
.actions { display: flex; gap: 20rpx; margin-top: 40rpx; }
.btn-approve { flex: 1; background: #52c41a; color: #fff; border-radius: 12rpx; height: 80rpx; line-height: 80rpx; }
.btn-reject { flex: 1; background: #ff4d4f; color: #fff; border-radius: 12rpx; height: 80rpx; line-height: 80rpx; }
</style>
