<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { getOrderDetail, getOrderDownload, exportDocx } from '../../../api';
import type { OrderItem } from '../../../types';

const orderId = ref('');
const order = ref<OrderItem | null>(null);
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

onLoad(async (options) => {
  orderId.value = options?.orderId ?? '';
  paperId.value = options?.paperId ?? '';
  if (!orderId.value) {
    uni.showToast({ title: '订单不存在', icon: 'none' });
    setTimeout(() => uni.navigateBack(), 800);
    return;
  }
  try {
    const res = await getOrderDetail(orderId.value);
    order.value = res.data;
    paperId.value = res.data.paperId ?? '';
    // Check if already exported
    await checkExistingExport();
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
    // Download
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
    // Not exported yet — export first
    await handleExportAndDownload();
  }
}

function triggerDownload(url: string) {
  if (!url) {
    uni.showToast({ title: '暂无导出文件', icon: 'none' });
    return;
  }
  // Prepend backend base URL for relative paths
  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
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
</script>

<template>
  <view class="detail" v-if="order">
    <view class="card">
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
    </view>

    <view v-if="order.status === 'paid'" class="actions">
      <button
        v-if="!downloadUrl"
        class="btn-export"
        :loading="exporting"
        @tap="handleExportAndDownload"
      >
        导出并下载 DOCX
      </button>
      <button
        v-else
        class="btn-download"
        :loading="downloading"
        @tap="handleDownload"
      >
        下载试卷
      </button>
    </view>
  </view>

  <view v-else class="empty">
    <text>未找到订单信息</text>
    <button class="btn-back" @tap="uni.navigateBack()">返回</button>
  </view>
</template>

<style scoped>
.detail {
  min-height: 100vh;
  padding: 24rpx 30rpx 60rpx;
  background: #f5f5f5;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx 28rpx;
  margin-bottom: 40rpx;
}

.title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 28rpx;
  line-height: 1.4;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.row:last-child {
  border-bottom: none;
}

.label {
  font-size: 26rpx;
  color: #999;
}

.value {
  font-size: 26rpx;
  color: #333;
  text-align: right;
  max-width: 60%;
  word-break: break-all;
}

.value.amount {
  color: #ff4d4f;
  font-weight: 600;
}

.value.status.paid {
  color: #52c41a;
}

.value.status.pending {
  color: #fa8c16;
}

.actions { margin-top: 20rpx; }
.btn-download {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: #1677ff;
  color: #fff;
  font-size: 32rpx;
  border-radius: 12rpx;
  border: none;
}
.btn-export {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: #52c41a;
  color: #fff;
  font-size: 32rpx;
  border-radius: 12rpx;
  border: none;
}

.empty {
  text-align: center;
  padding: 200rpx 40rpx;
  color: #999;
  font-size: 28rpx;
}

.btn-back {
  margin-top: 40rpx;
  background: #fff;
  color: #1677ff;
  border: 1rpx solid #1677ff;
  border-radius: 8rpx;
  font-size: 28rpx;
}
</style>
