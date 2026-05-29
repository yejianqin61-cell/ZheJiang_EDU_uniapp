<script setup lang="ts">
import { usePaperStore } from '../../../stores/paper';
import { useOrderStore } from '../../../stores/order';
import { exportDocx, exportPdf } from '../../../api';

const paper = usePaperStore();
const order = useOrderStore();

const PREVIEW_LIMIT = 5; // 首页预览题数

const previewQuestions = paper.currentPaper?.questions.slice(0, PREVIEW_LIMIT) ?? [];
const totalQuestions = paper.currentPaper?.questions.length ?? 0;

async function handlePay() {
  if (!paper.currentPaper) return;
  try {
    await order.create(paper.currentPaper.paperId);
    uni.navigateTo({ url: '/pages/payment/index' });
  } catch { /* error handled in api */ }
}
</script>

<template>
  <view class="preview" v-if="paper.currentPaper">
    <view class="paper-header">
      <text class="paper-title">{{ paper.currentPaper.title }}</text>
      <text class="paper-meta">共 {{ totalQuestions }} 题 | 生成耗时 {{ paper.currentPaper.generateTime }}s</text>
    </view>

    <view class="question-list">
      <view v-for="q in previewQuestions" :key="q.index" class="question-card">
        <view class="q-header"><text class="q-index">{{ q.index }}.</text><text class="q-type">[{{ q.type }}]</text></view>
        <text class="q-content">{{ q.content }}</text>
        <view v-if="q.options.length" class="q-options">
          <view v-for="(opt, i) in q.options" :key="i" class="q-option">{{ opt }}</view>
        </view>
      </view>
    </view>

    <view v-if="totalQuestions > PREVIEW_LIMIT" class="preview-blocker">
      <text>支付后查看完整试卷（剩余 {{ totalQuestions - PREVIEW_LIMIT }} 题）</text>
    </view>

    <view class="bottom-bar">
      <button class="btn-pay" @tap="handlePay">支付并导出</button>
      <button class="btn-retry" @tap="paper.regenerate">重新生成</button>
    </view>
  </view>
</template>

<style scoped>
.preview { padding: 30rpx; padding-bottom: 140rpx; }
.paper-header { background: #fff; border-radius: 12rpx; padding: 30rpx; margin-bottom: 24rpx; }
.paper-title { font-size: 36rpx; font-weight: bold; display: block; margin-bottom: 12rpx; }
.paper-meta { font-size: 24rpx; color: #999; }
.question-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; }
.q-header { margin-bottom: 12rpx; }
.q-index { font-weight: bold; margin-right: 12rpx; }
.q-type { font-size: 22rpx; color: #1677ff; }
.q-content { font-size: 30rpx; line-height: 1.6; }
.q-options { margin-top: 16rpx; }
.q-option { padding: 8rpx 0; font-size: 28rpx; color: #555; }
.preview-blocker { text-align: center; padding: 40rpx; color: #ff4d4f; font-size: 28rpx; background: #fff; border-radius: 12rpx; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; gap: 20rpx; padding: 20rpx 30rpx; background: #fff; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.06); }
.btn-pay { flex: 1; background: #1677ff; color: #fff; border-radius: 12rpx; height: 80rpx; line-height: 80rpx; font-size: 30rpx; }
.btn-retry { width: 180rpx; background: #fff; color: #666; border: 1px solid #d9d9d9; border-radius: 12rpx; height: 80rpx; line-height: 80rpx; font-size: 26rpx; }
</style>
