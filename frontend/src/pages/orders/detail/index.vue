<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getOrderDetail, getOrderDownload, exportDocx } from '../../../api';
import { buildDownloadUrl } from '../../../config/env';
import type { OrderDetail } from '../../../types';

const orderId = ref('');
const order = ref<OrderDetail | null>(null);
const downloading = ref(false);
const exporting = ref(false);
const loading = ref(true);
const paperId = ref('');

const statusLabel: Record<string, string> = {
  paid: '已支付',
  pending: '待支付',
  cancelled: '已取消',
  expired: '已过期',
};

const printStatusLabel: Record<string, string> = {
  null: '待处理',
  printing: '打印中',
  shipped: '已发货',
  delivered: '已签收',
};

const PRINT_STATUS_FLOW = ['printing', 'shipped', 'delivered'];

onLoad(async (options) => {
  orderId.value = options?.orderId ?? '';
  if (!orderId.value) {
    uni.showToast({ title: '订单不存在', icon: 'none' });
    setTimeout(() => uni.navigateBack(), 800);
    return;
  }
  try {
    const res = await getOrderDetail(orderId.value);
    order.value = res.data as OrderDetail;
    paperId.value = res.data.paperId ?? '';
  } catch {
    uni.showToast({ title: '订单加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
});

let downloadUrl = '';

async function checkExistingExport() {
  try {
    const res = await getOrderDownload(orderId.value);
    downloadUrl = res.data.docxUrl ?? res.data.pdfUrl ?? '';
  } catch { /* not exported yet */ }
}

async function handleExportAndDownload() {
  if (!paperId.value || exporting.value) return;
  exporting.value = true;
  try {
    uni.showToast({ title: '正在生成试卷...', icon: 'loading', duration: 3000 });
    const res = await exportDocx(paperId.value);
    downloadUrl = res.data.downloadUrl ?? '';
    uni.showToast({ title: '导出成功', icon: 'success' });
    triggerDownload(downloadUrl);
  } catch {
    uni.showToast({ title: '导出失败，请重试', icon: 'none' });
  } finally {
    exporting.value = false;
  }
}

async function handleDownload() {
  if (downloading.value) return;
  if (downloadUrl) {
    triggerDownload(downloadUrl);
  } else {
    await handleExportAndDownload();
  }
}

function triggerDownload(url: string) {
  if (!url) {
    uni.showToast({ title: '暂无导出文件', icon: 'none' });
    return;
  }
  const fullUrl = buildDownloadUrl(url);
  // #ifdef H5
  window.open(fullUrl, '_blank');
  // #endif
  // #ifndef H5
  uni.downloadFile({
    url: fullUrl,
    success: (r) => {
      if (r.statusCode === 200) {
        uni.openDocument({ filePath: r.tempFilePath, showMenu: true });
      }
    },
    fail: () => uni.showToast({ title: '下载失败', icon: 'none' }),
  });
  // #endif
}

function isPrintOrder(): boolean {
  return order.value?.type === 'print';
}

function getActivePrintStep(): number {
  if (!order.value?.printStatus) return -1;
  return PRINT_STATUS_FLOW.indexOf(order.value.printStatus);
}
</script>

<template>
  <view v-if="loading" class="loading">加载中...</view>

  <!-- Download Order Detail -->
  <view class="detail" v-else-if="order && !isPrintOrder()">
    <view class="card">
      <text class="type-badge download-badge">📥 下载服务</text>
      <text class="title">{{ order.paperTitle }}</text>
      <view class="row">
        <text class="label">订单号</text>
        <text class="value">{{ order.orderNo }}</text>
      </view>
      <view class="row">
        <text class="label">金额</text>
        <text class="value amount">¥{{ (order.amount / 100).toFixed(2) }}</text>
      </view>
      <view class="row">
        <text class="label">状态</text>
        <text class="value status" :class="order.status">{{ statusLabel[order.status] ?? order.status }}</text>
      </view>
      <view class="row">
        <text class="label">创建时间</text>
        <text class="value">{{ order.createdAt }}</text>
      </view>
      <view v-if="order.paidAt" class="row">
        <text class="label">支付时间</text>
        <text class="value">{{ order.paidAt }}</text>
      </view>
    </view>

    <view v-if="order.status === 'paid'" class="actions">
      <button class="btn-download" :loading="downloading || exporting" @tap="handleDownload">
        下载试卷
      </button>
    </view>
  </view>

  <!-- Print Order Detail -->
  <view class="detail" v-else-if="order && isPrintOrder()">
    <view class="card">
      <text class="type-badge print-badge">🖨️ 打印服务</text>
      <text class="title">{{ order.paperTitle }}</text>
      <view class="row">
        <text class="label">订单号</text>
        <text class="value">{{ order.orderNo }}</text>
      </view>
      <view class="row">
        <text class="label">下单时间</text>
        <text class="value">{{ order.createdAt }}</text>
      </view>
      <view v-if="order.paidAt" class="row">
        <text class="label">支付时间</text>
        <text class="value">{{ order.paidAt }}</text>
      </view>
      <view class="row">
        <text class="label">订单金额</text>
        <text class="value amount">¥{{ (order.amount / 100).toFixed(2) }}</text>
      </view>
    </view>

    <!-- Print Info -->
    <view class="card">
      <text class="section-title">打印信息</text>
      <view class="row">
        <text class="label">打印份数</text>
        <text class="value">{{ order.copies ?? '—' }} 份</text>
      </view>
      <view class="row" v-if="order.pricingSnapshot">
        <text class="label">单价</text>
        <text class="value">¥{{ ((order.pricingSnapshot.unitPrice ?? order.unitPrice) / 100).toFixed(2) }} / 份</text>
      </view>
      <view class="row" v-if="order.questionCount">
        <text class="label">题数</text>
        <text class="value">{{ order.questionCount }} 题</text>
      </view>
    </view>

    <!-- Shipping Address -->
    <view class="card" v-if="order.shipping">
      <text class="section-title">收货地址</text>
      <view class="shipping-info">
        <text class="ship-name">{{ order.shipping.receiverName }}</text>
        <text class="ship-phone">{{ order.shipping.phone }}</text>
        <text class="ship-addr">{{ order.shipping.fullAddress }}</text>
      </view>
    </view>

    <!-- Print Status Timeline -->
    <view class="card">
      <text class="section-title">物流状态</text>
      <view class="timeline">
        <view
          v-for="(step, i) in PRINT_STATUS_FLOW"
          :key="step"
          class="timeline-item"
          :class="{ active: getActivePrintStep() >= i, current: getActivePrintStep() === i }"
        >
          <view class="timeline-dot"></view>
          <view class="timeline-content">
            <text class="timeline-label">{{ printStatusLabel[step] }}</text>
            <text
              v-if="order.printStatusLog?.find(s => s.status === step)"
              class="timeline-time"
            >
              {{ order.printStatusLog.find(s => s.status === step)?.time }}
            </text>
          </view>
        </view>
        <!-- If print_status is null (not yet started) -->
        <view
          v-if="!order.printStatus"
          class="timeline-item current"
        >
          <view class="timeline-dot"></view>
          <view class="timeline-content">
            <text class="timeline-label">待处理</text>
            <text class="timeline-time">等待处理</text>
          </view>
        </view>
      </view>
    </view>
  </view>

  <view v-else class="empty">
    <text>未找到订单信息</text>
    <button class="btn-back" @tap="uni.navigateBack()">返回</button>
  </view>
</template>

<style scoped>
.detail { min-height: 100vh; padding: 24rpx 30rpx 60rpx; background: #f5f5f5; }
.loading { text-align: center; padding: 200rpx 0; color: #999; }

.card { background: #fff; border-radius: 16rpx; padding: 32rpx 28rpx; margin-bottom: 20rpx; }

.type-badge { font-size: 24rpx; padding: 4rpx 16rpx; border-radius: 20rpx; display: inline-block; margin-bottom: 16rpx; }
.download-badge { background: #e6f7ff; color: #1677ff; }
.print-badge { background: #fff7e6; color: #fa8c16; }

.title { display: block; font-size: 32rpx; font-weight: 600; color: #1a1a1a; margin-bottom: 28rpx; line-height: 1.4; }
.section-title { font-size: 28rpx; font-weight: 600; color: #333; display: block; margin-bottom: 20rpx; }

.row { display: flex; justify-content: space-between; align-items: center; padding: 14rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.row:last-child { border-bottom: none; }
.label { font-size: 26rpx; color: #999; }
.value { font-size: 26rpx; color: #333; text-align: right; max-width: 60%; word-break: break-all; }
.value.amount { color: #ff4d4f; font-weight: 600; }
.value.status.paid { color: #52c41a; }
.value.status.pending { color: #fa8c16; }

/* Shipping */
.shipping-info { padding: 4rpx 0; }
.ship-name { font-size: 30rpx; font-weight: 500; display: block; margin-bottom: 6rpx; }
.ship-phone { font-size: 26rpx; color: #666; display: block; margin-bottom: 6rpx; }
.ship-addr { font-size: 26rpx; color: #888; line-height: 1.4; display: block; }

/* Timeline */
.timeline { padding-left: 20rpx; }
.timeline-item { display: flex; align-items: flex-start; padding: 12rpx 0; position: relative; }
.timeline-item:not(:last-child)::before { content: ''; position: absolute; left: 9rpx; top: 28rpx; bottom: 0; width: 2rpx; background: #e8e8e8; }
.timeline-item.active::before { background: #1677ff; }
.timeline-item.current .timeline-label { color: #1677ff; font-weight: 600; }
.timeline-dot { width: 20rpx; height: 20rpx; border-radius: 50%; background: #e8e8e8; margin-right: 20rpx; flex-shrink: 0; margin-top: 4rpx; }
.timeline-item.active .timeline-dot { background: #1677ff; }
.timeline-content { flex: 1; }
.timeline-label { font-size: 28rpx; color: #999; display: block; }
.timeline-item.active .timeline-label { color: #333; }
.timeline-time { font-size: 22rpx; color: #bbb; margin-top: 4rpx; display: block; }

/* Actions */
.actions { margin-top: 20rpx; }
.btn-download { width: 100%; height: 96rpx; line-height: 96rpx; background: #1677ff; color: #fff; font-size: 32rpx; border-radius: 12rpx; border: none; }

.empty { text-align: center; padding: 200rpx 40rpx; color: #999; font-size: 28rpx; }
.btn-back { margin-top: 40rpx; background: #fff; color: #1677ff; border: 1rpx solid #1677ff; border-radius: 8rpx; font-size: 28rpx; }
</style>
