<script setup lang="ts">
import { onMounted } from 'vue';
import { useOrderStore } from '../../stores/order';

const store = useOrderStore();

onMounted(() => { store.fetchOrders(); });

function goDetail(orderId: string) {
  uni.navigateTo({ url: `/pages/orders/detail/index?orderId=${orderId}` });
}
</script>

<template>
  <view class="orders">
    <view v-if="store.orders.length === 0" class="empty">暂无订单</view>
    <view v-for="o in store.orders" :key="o.orderId" class="order-card" @tap="goDetail(o.orderId)">
      <view class="order-info">
        <text class="order-title">{{ o.paperTitle }}</text>
        <text class="order-meta">¥{{ (o.amount / 100).toFixed(2) }} | {{ o.createdAt }}</text>
      </view>
      <view class="order-status" :class="o.status">{{ o.status === 'paid' ? '已支付' : o.status === 'pending' ? '待支付' : '已取消' }}</view>
      <text class="arrow">&#8250;</text>
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
.arrow { font-size: 32rpx; color: #ccc; }
</style>
