<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usePaperStore } from '../../../stores/paper';
import { getPublicPricing } from '../../../api';
import type { PricingConfig } from '../../../types';

const paper = usePaperStore();
const pricing = ref<PricingConfig | null>(null);

const PREVIEW_LIMIT = 5;
const previewQuestions = paper.currentPaper?.questions.slice(0, PREVIEW_LIMIT) ?? [];
const totalQuestions = paper.currentPaper?.questions.length ?? 0;

onMounted(async () => {
  try {
    const res = await getPublicPricing();
    pricing.value = res.data;
  } catch { /* use fallback pricing */ }
});

function calcDownloadPrice(): string {
  if (!pricing.value) return '—';
  const unit = pricing.value.download.unitPrice;
  return `¥${(unit / 100).toFixed(2)}/题 × ${totalQuestions}题 = ¥${((unit * totalQuestions) / 100).toFixed(2)}`;
}

function calcPrintRange(): string {
  if (!pricing.value || !pricing.value.print.length) return '—';
  const tiers = pricing.value.print;
  const min = tiers[0].unitPrice;
  const max = tiers[tiers.length - 1].unitPrice;
  return `¥${(min / 100).toFixed(2)}~${(max / 100).toFixed(2)}/份，量大优惠`;
}

function goDownloadPay() {
  if (!paper.currentPaper) return;
  uni.navigateTo({ url: `/pages/payment/index?paperId=${paper.currentPaper.paperId}&type=download` });
}

function goPrintCheckout() {
  if (!paper.currentPaper) return;
  uni.navigateTo({ url: `/pages/print/checkout/index?paperId=${paper.currentPaper.paperId}` });
}
</script>

<template>
  <view class="preview" v-if="paper.currentPaper">
    <!-- Watermark -->
    <view class="watermark-layer">AI辅助生成｜仅供备课参考｜使用前请核对</view>

    <view class="paper-header">
      <text class="paper-title">{{ paper.currentPaper.title }}</text>
      <text class="paper-meta">共 {{ totalQuestions }} 题 | 生成耗时 {{ paper.currentPaper.generateTime }}s</text>
    </view>

    <view class="question-list">
      <view v-for="q in previewQuestions" :key="q.index" class="question-card">
        <view class="q-header"><text class="q-index">{{ q.index }}.</text><text class="q-type">[{{ q.type }}]</text></view>
        <text class="q-content">{{ q.content }}</text>
        <view v-if="q.options?.length" class="q-options">
          <view v-for="(opt, i) in q.options" :key="i" class="q-option">{{ opt }}</view>
        </view>
      </view>
    </view>

    <view v-if="totalQuestions > PREVIEW_LIMIT" class="preview-blocker">
      <text>前 {{ PREVIEW_LIMIT }} 题免费预览，支付后查看完整试卷（剩余 {{ totalQuestions - PREVIEW_LIMIT }} 题）</text>
    </view>

    <!-- 分流服务卡片 -->
    <view class="diversion">
      <view class="service-card download-card" @tap="goDownloadPay">
        <view class="card-icon">📥</view>
        <view class="card-body">
          <text class="card-title">下载试卷</text>
          <text class="card-desc">支付后可下载 DOCX / PDF 文件，自行打印</text>
          <text class="card-price">{{ calcDownloadPrice() }}</text>
        </view>
        <view class="card-action">去支付 &#8250;</view>
      </view>

      <view class="service-card print-card" @tap="goPrintCheckout">
        <view class="card-icon">🖨️</view>
        <view class="card-body">
          <text class="card-title">打印并快递</text>
          <text class="card-desc">在线支付，我们打印好快递上门</text>
          <text class="card-price">{{ calcPrintRange() }}</text>
        </view>
        <view class="card-action">去下单 &#8250;</view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.preview { padding: 30rpx; padding-bottom: 40rpx; position: relative; overflow: hidden; }
.watermark-layer { position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-wrap: wrap; align-content: center; justify-content: center; pointer-events: none; z-index: 0; opacity: 0.06; font-size: 36rpx; color: #999; transform: rotate(-20deg); padding: 40rpx; line-height: 3; text-align: center; white-space: pre-wrap; }
.paper-header, .question-list, .preview-blocker, .diversion { position: relative; z-index: 1; }
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
.preview-blocker { text-align: center; padding: 40rpx; color: #ff4d4f; font-size: 28rpx; background: #fff; border-radius: 12rpx; margin-bottom: 30rpx; }

/* Diversion Cards */
.diversion { display: flex; flex-direction: column; gap: 20rpx; margin-top: 10rpx; }
.service-card { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 28rpx 24rpx; border: 2rpx solid #e8e8e8; transition: all 0.2s; }
.service-card:active { border-color: #1677ff; background: #f0f5ff; }
.card-icon { font-size: 48rpx; margin-right: 20rpx; flex-shrink: 0; }
.card-body { flex: 1; min-width: 0; }
.card-title { font-size: 30rpx; font-weight: 600; display: block; margin-bottom: 6rpx; }
.card-desc { font-size: 24rpx; color: #888; display: block; margin-bottom: 8rpx; }
.card-price { font-size: 26rpx; color: #ff4d4f; font-weight: 500; }
.card-action { font-size: 26rpx; color: #1677ff; font-weight: 500; flex-shrink: 0; margin-left: 12rpx; }
</style>
