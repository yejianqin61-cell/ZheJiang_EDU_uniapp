<script setup lang="ts">
import { ref, computed } from 'vue';
import { useOrderStore } from '../../stores/order';

const order = useOrderStore();
const paying = ref(false);

const isDev = computed(() =>
  order.currentOrder?.wxPayParams?.paySign === 'DEV_MOCK_SIGN'
);

async function handleWxPay() {
  if (!order.currentOrder) return;
  paying.value = true;
  try {
    if (isDev.value) {
      // Dev: call mock-pay API directly instead of wx.requestPayment
      const BASE_URL = 'http://localhost:3000/v1';
      const token = uni.getStorageSync('accessToken');
      await new Promise<void>((resolve, reject) => {
        uni.request({
          method: 'POST',
          url: `${BASE_URL}/orders/${order.currentOrder!.orderId}/mock-pay`,
          header: { Authorization: `Bearer ${token}` },
          success: (res: any) => {
            if (res.data?.code === 0) resolve();
            else reject(new Error(res.data?.message ?? 'pay failed'));
          },
          fail: reject,
        });
      });
    } else {
      // Production: real WeChat Pay JSAPI
      const p = order.currentOrder.wxPayParams!;
      await uni.requestPayment({
        // @ts-ignore
        timeStamp: p.timeStamp,
        nonceStr: p.nonceStr,
        package: p.package,
        signType: p.signType,
        paySign: p.paySign,
      });
    }
    uni.showToast({ title: '支付成功', icon: 'success' });
    uni.navigateBack({ delta: 2 });
  } catch (e: any) {
    console.error('Payment error:', e);
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
