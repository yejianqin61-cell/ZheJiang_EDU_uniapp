<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useOrderStore } from '../../stores/order';
import { createOrder, getMyBalance, payByBalance } from '../../api';
import { getApiBase } from '../../config/env';

const order = useOrderStore();
const paying = ref(false);
const payMethod = ref<'wechat' | 'balance'>('wechat');
const userBalance = ref(0);
const balanceLoaded = ref(false);

const queryPaperId = ref('');
const queryType = ref('download');

onLoad(async (options) => {
  queryPaperId.value = options?.paperId ?? '';
  queryType.value = options?.type ?? 'download';

  // Load balance
  try {
    const b = await getMyBalance();
    userBalance.value = b.data.balance;
  } catch { /* ignore */ }
  balanceLoaded.value = true;

  // If paperId provided, create order
  if (queryPaperId.value && !order.currentOrder) {
    try {
      await order.create(queryPaperId.value, queryType.value as 'download' | 'print');
    } catch (e: any) {
      uni.showToast({ title: e?.message ?? '创建订单失败', icon: 'none' });
      setTimeout(() => uni.navigateBack(), 1000);
    }
  }
});

const canBalancePay = computed(() =>
  order.currentOrder && userBalance.value >= order.currentOrder.amount
);

const isDev = computed(() =>
  order.currentOrder?.wxPayParams?.paySign === 'DEV_MOCK_SIGN'
  || !order.currentOrder?.wxPayParams
);

async function handleBalancePay() {
  if (!order.currentOrder) return;
  if (!canBalancePay.value) { uni.showToast({ title: '余额不足', icon: 'none' }); return; }
  paying.value = true;
  try {
    await payByBalance(order.currentOrder.orderId);
    uni.showToast({ title: '支付成功', icon: 'success' });
    setTimeout(() => {
      if (order.currentOrder?.type === 'print') {
        uni.switchTab({ url: '/pages/index/index' });
      } else {
        uni.redirectTo({ url: `/pages/orders/detail/index?orderId=${order.currentOrder!.orderId}` });
      }
    }, 800);
  } catch (e: any) {
    uni.showToast({ title: e?.message ?? '支付失败', icon: 'none' });
  } finally {
    paying.value = false;
  }
}

async function handleWxPay() {
  if (!order.currentOrder) return;
  paying.value = true;
  try {
    if (isDev.value) {
      const BASE_URL = getApiBase();
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
      const p = order.currentOrder.wxPayParams!;
      if (!p) {
        uni.showToast({ title: '暂不支持真机支付', icon: 'none' });
        paying.value = false;
        return;
      }
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
    setTimeout(() => {
      if (order.currentOrder?.type === 'print') {
        uni.switchTab({ url: '/pages/index/index' });
      } else {
        uni.redirectTo({ url: `/pages/orders/detail/index?orderId=${order.currentOrder!.orderId}` });
      }
    }, 800);
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
      <text class="type-badge" :class="order.currentOrder.type === 'print' ? 'print-badge' : 'download-badge'">
        {{ order.currentOrder.type === 'print' ? '🖨️ 打印服务' : '📥 下载服务' }}
      </text>
      <text class="label">订单金额</text>
      <text class="amount">¥{{ (order.currentOrder.amount / 100).toFixed(2) }}</text>
      <text class="order-no">订单号: {{ order.currentOrder.orderNo }}</text>
    </view>

    <!-- Balance Pay -->
    <button
      class="btn-balance"
      :class="{ disabled: !canBalancePay }"
      :loading="paying && payMethod === 'balance'"
      :disabled="!canBalancePay"
      @tap="handleBalancePay"
    >
      余额支付 (余额 ¥{{ (userBalance / 100).toFixed(2) }})
      <text v-if="!canBalancePay && balanceLoaded" class="insufficient"> — 余额不足</text>
    </button>

    <!-- WeChat Pay -->
    <button
      class="btn-pay"
      :loading="paying && payMethod === 'wechat'"
      @tap="handleWxPay"
    >
      微信支付
    </button>

    <text class="divider">— 或 —</text>
  </view>
  <view v-else class="empty">
    <text>订单加载中...</text>
  </view>
</template>

<style scoped>
.payment { padding: 60rpx 40rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 60rpx 40rpx; text-align: center; margin-bottom: 40rpx; }
.type-badge { font-size: 26rpx; padding: 6rpx 24rpx; border-radius: 20rpx; display: inline-block; margin-bottom: 24rpx; }
.download-badge { background: #e6f7ff; color: #1677ff; }
.print-badge { background: #fff7e6; color: #fa8c16; }
.label { font-size: 28rpx; color: #999; display: block; margin-bottom: 24rpx; }
.amount { font-size: 72rpx; font-weight: bold; color: #ff4d4f; display: block; margin-bottom: 16rpx; }
.order-no { font-size: 22rpx; color: #ccc; }
.btn-balance { width: 100%; background: #fa8c16; color: #fff; border-radius: 12rpx; height: 96rpx; line-height: 96rpx; font-size: 32rpx; margin-bottom: 20rpx; border: none; }
.btn-balance.disabled { background: #d9d9d9; color: #999; }
.insufficient { font-size: 24rpx; }
.btn-pay { width: 100%; background: #07c160; color: #fff; border-radius: 12rpx; height: 96rpx; line-height: 96rpx; font-size: 32rpx; border: none; }
.divider { text-align: center; display: block; margin-top: 30rpx; color: #ccc; font-size: 26rpx; }
.empty { text-align: center; padding: 200rpx 0; color: #999; }
</style>
