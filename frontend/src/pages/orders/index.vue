<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useOrderStore } from '../../stores/order';
import { getOrders, getOrderDownload } from '../../api';
import { buildDownloadUrl } from '../../config/env';
import type { OrderItem } from '../../types';

const store = useOrderStore();
const activeTab = ref<'download' | 'print'>('download');

onMounted(() => {
  fetchByTab();
});

async function fetchByTab() {
  store.activeTab = activeTab.value;
  await store.fetchOrders(1, activeTab.value);
}

function switchTab(tab: 'download' | 'print') {
  activeTab.value = tab;
  fetchByTab();
}

function goDetail(orderId: string) {
  uni.navigateTo({ url: `/pages/orders/detail/index?orderId=${orderId}` });
}

const printStatusLabel: Record<string, string> = {
  null: '待处理',
  printing: '打印中',
  shipped: '已发货',
  delivered: '已签收',
};

async function handleDownload(orderId: string, e: Event) {
  e.stopPropagation && e.stopPropagation();
  try {
    const res = await getOrderDownload(orderId);
    const url = res.data.docxUrl ?? res.data.pdfUrl ?? '';
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
  } catch {
    uni.showToast({ title: '获取下载链接失败', icon: 'none' });
  }
}
</script>

<template>
  <view class="orders">
    <!-- Tab Bar -->
    <view class="tab-bar">
      <view
        class="tab-item"
        :class="{ active: activeTab === 'download' }"
        @tap="switchTab('download')"
      >
        <text>下载服务</text>
      </view>
      <view
        class="tab-item"
        :class="{ active: activeTab === 'print' }"
        @tap="switchTab('print')"
      >
        <text>打印服务</text>
      </view>
    </view>

    <!-- Tab: Download -->
    <view v-if="activeTab === 'download'">
      <view v-if="store.orders.length === 0" class="empty">暂无下载订单</view>
      <view
        v-for="o in store.orders"
        :key="o.orderId"
        class="order-card"
        @tap="goDetail(o.orderId)"
      >
        <view class="order-left">
          <text class="order-type-tag download-tag">📥 下载</text>
          <text class="order-title">{{ o.paperTitle }}</text>
          <text class="order-meta">¥{{ (o.amount / 100).toFixed(2) }} | {{ o.createdAt }}</text>
        </view>
        <view class="order-right">
          <view class="order-status" :class="o.status">
            {{ o.status === 'paid' ? '已支付' : o.status === 'pending' ? '待支付' : '已取消' }}
          </view>
          <button
            v-if="o.status === 'paid' && o.hasExport !== false"
            class="btn-download-sm"
            @tap="(e: Event) => handleDownload(o.orderId, e)"
          >
            下载
          </button>
        </view>
      </view>
    </view>

    <!-- Tab: Print -->
    <view v-if="activeTab === 'print'">
      <view v-if="store.orders.length === 0" class="empty">暂无打印订单</view>
      <view
        v-for="o in store.orders"
        :key="o.orderId"
        class="order-card"
        @tap="goDetail(o.orderId)"
      >
        <view class="order-left">
          <text class="order-type-tag print-tag">🖨️ 打印</text>
          <text class="order-title">{{ o.paperTitle }}</text>
          <text class="order-meta">
            {{ o.copies ? `${o.copies}份 | ` : '' }}¥{{ (o.amount / 100).toFixed(2) }}
          </text>
          <text v-if="o.shipping" class="order-addr">{{ o.shipping.receiverName }} {{ o.shipping.phone }}</text>
        </view>
        <view class="order-right">
          <view
            class="print-status"
            :class="o.printStatus ?? 'null'"
          >
            {{ printStatusLabel[String(o.printStatus)] ?? '待处理' }}
          </view>
          <text class="arrow">&#8250;</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.orders { min-height: 100vh; background: #f5f5f5; }

/* Tab Bar */
.tab-bar { display: flex; background: #fff; border-bottom: 1rpx solid #e8e8e8; position: sticky; top: 0; z-index: 10; }
.tab-item { flex: 1; text-align: center; padding: 28rpx 0; font-size: 30rpx; color: #666; border-bottom: 4rpx solid transparent; transition: all 0.2s; }
.tab-item.active { color: #1677ff; border-bottom-color: #1677ff; font-weight: 600; }

.empty { text-align: center; padding: 200rpx 0; color: #999; font-size: 28rpx; }

/* Order Cards */
.order-card { display: flex; align-items: center; background: #fff; margin: 16rpx 30rpx; border-radius: 12rpx; padding: 24rpx; }
.order-left { flex: 1; min-width: 0; }
.order-type-tag { font-size: 22rpx; margin-bottom: 4rpx; display: inline-block; }
.download-tag { color: #1677ff; }
.print-tag { color: #fa8c16; }
.order-title { font-size: 28rpx; font-weight: 500; display: block; margin-bottom: 6rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.order-meta { font-size: 22rpx; color: #999; display: block; }
.order-addr { font-size: 22rpx; color: #bbb; display: block; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.order-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8rpx; flex-shrink: 0; margin-left: 16rpx; }
.order-status { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 4rpx; }
.order-status.paid { background: #f6ffed; color: #52c41a; }
.order-status.pending { background: #fff7e6; color: #fa8c16; }

.print-status { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 4rpx; }
.print-status.null { background: #fff7e6; color: #fa8c16; }
.print-status.printing { background: #e6f7ff; color: #1677ff; }
.print-status.shipped { background: #f0f5ff; color: #2f54eb; }
.print-status.delivered { background: #f6ffed; color: #52c41a; }
.arrow { font-size: 32rpx; color: #ccc; }

.btn-download-sm { height: 52rpx; line-height: 52rpx; padding: 0 20rpx; font-size: 24rpx; background: #1677ff; color: #fff; border: none; border-radius: 8rpx; }
</style>
