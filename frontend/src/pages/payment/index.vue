<script setup lang="ts">
import { ref } from 'vue';
import { useOrderStore } from '../../stores/order';
import { getPaymentStatus } from '../../api';

const order = useOrderStore();
const paying = ref(false);

async function handleWxPay() {
  if (!order.currentOrder?.wxPayParams) return;
  paying.value = true;
  try {
    await uni.requestPayment({
      // @ts-ignore
      timeStamp: order.currentOrder.wxPayParams.timeStamp,
      nonceStr: order.currentOrder.wxPayParams.nonceStr,
      package: order.currentOrder.wxPayParams.package,
      signType: order.currentOrder.wxPayParams.signType,
      paySign: order.currentOrder.wxPayParams.paySign,
    });
    uni.showToast({ title: '支付成功', icon: 'success' });
    uni.navigateBack({ delta: 2 });
  } catch {
    uni.showToast({ title: '支付取消或失败', icon: 'none' });
  } finally {
    paying.value = false;
  }
}
</script>

<template>
  <view class="payment" v-if="order.currentOrder">
    <view class="card">
      <text class="label">订单金额</text>
      <text class="amount">¥{{ (order.currentOrder.amount / 100).toFixed(2) }}</text>
      <text class="order-no">订单号: {{ order.currentOrder.orderNo }}</text>
    </view>
    <button class="btn-pay" :loading="paying" @tap="handleWxPay">微信支付</button>
  </view>
</template>

<style scoped>
.payment { padding: 60rpx 40rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 60rpx 40rpx; text-align: center; margin-bottom: 80rpx; }
.label { font-size: 28rpx; color: #999; display: block; margin-bottom: 24rpx; }
.amount { font-size: 72rpx; font-weight: bold; color: #ff4d4f; display: block; margin-bottom: 16rpx; }
.order-no { font-size: 22rpx; color: #ccc; }
.btn-pay { width: 100%; background: #07c160; color: #fff; border-radius: 12rpx; height: 96rpx; line-height: 96rpx; font-size: 32rpx; }
</style>
