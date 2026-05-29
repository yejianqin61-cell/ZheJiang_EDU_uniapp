<script setup lang="ts">
import { onMounted } from 'vue';
import { useOrderStore } from '../../stores/order';
import { getOrderDownload } from '../../api';

const store = useOrderStore();

onMounted(() => { store.fetchOrders(); });

async function handleDownload(orderId: string) {
  try {
    const res = await getOrderDownload(orderId);
    // TODO: trigger file download with res.data.docxUrl or res.data.pdfUrl
    uni.showToast({ title: '开始下载', icon: 'success' });
  } catch { /* error handled */ }
}
</script>

<template>
  <view class="orders">
    <view v-if="store.orders.length === 0" class="empty">暂无订单</view>
    <view v-for="o in store.orders" :key="o.orderId" class="order-card">
      <view class="order-info">
        <text class="order-title">{{ o.paperTitle }}</text>
        <text class="order-meta">¥{{ (o.amount / 100).toFixed(2) }} | {{ o.createdAt }}</text>
      </view>
      <view class="order-status" :class="o.status">{{ o.status === 'paid' ? '已支付' : o.status === 'pending' ? '待支付' : '已取消' }}</view>
      <button v-if="o.status === 'paid'" class="btn-download" @tap="handleDownload(o.orderId)">下载</button>
    </view>
  </view>
</template>

<style scoped>
.orders { padding: 20rpx 30rpx; }
.empty { text-align: center; padding: 200rpx 0; color: #999; }
.order-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; display: flex; align-items: center; }
.order-info { flex: 1; }
.order-title { font-size: 28rpx; font-weight: 500; display: block; margin-bottom: 8rpx; }
.order-meta { font-size: 22rpx; color: #999; }
.order-status { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 4rpx; margin: 0 16rpx; }
.order-status.paid { background: #f6ffed; color: #52c41a; }
.order-status.pending { background: #fff7e6; color: #fa8c16; }
.btn-download { font-size: 22rpx; padding: 8rpx 20rpx; background: #1677ff; color: #fff; border-radius: 6rpx; }
</style>
