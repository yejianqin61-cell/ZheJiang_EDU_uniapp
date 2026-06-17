<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { useOrderStore } from '../../../stores/order';
import { getPublicPricing, getShippingAddresses } from '../../../api';
import type { PricingConfig, ShippingAddress } from '../../../types';

const orderStore = useOrderStore();

const paperId = ref('');
const paperTitle = ref('');
const questionCount = ref(0);
const copies = ref(1);
const selectedAddress = ref<ShippingAddress | null>(null);
const pricing = ref<PricingConfig | null>(null);
const loading = ref(false);

onLoad((options) => {
  paperId.value = options?.paperId ?? '';
  // Title and count are passed via query or global store
  paperTitle.value = options?.title ?? '';
  questionCount.value = Number(options?.count ?? 0);
});

onMounted(async () => { await refreshData(); });

// Refresh addresses every time page comes back into view (from address picker)
onShow(async () => { await refreshAddresses(); });

async function refreshData() {
  try {
    const [pRes, aRes] = await Promise.all([
      getPublicPricing(),
      getShippingAddresses(),
    ]);
    pricing.value = pRes.data;
    const addresses = (aRes.data ?? []) as ShippingAddress[];
    selectedAddress.value = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
  } catch { /* use defaults */ }
}

async function refreshAddresses() {
  try {
    const res = await getShippingAddresses();
    const addresses = (res.data ?? []) as ShippingAddress[];
    if (!selectedAddress.value) {
      selectedAddress.value = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
    } else {
      // Update selected address data if it still exists
      const updated = addresses.find((a) => a.id === selectedAddress.value?.id);
      if (updated) selectedAddress.value = updated;
      else selectedAddress.value = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
    }
  } catch { /* ignore */ }
}

const currentTier = computed(() => {
  if (!pricing.value?.print?.length) return null;
  for (const tier of pricing.value.print) {
    const max = tier.maxQuantity ?? Number.MAX_SAFE_INTEGER;
    if (copies.value >= tier.minQuantity && copies.value <= max) {
      return tier;
    }
  }
  return pricing.value.print[pricing.value.print.length - 1];
});

const totalPrice = computed(() => {
  if (!currentTier.value) return 0;
  return copies.value * currentTier.value.unitPrice;
});

function onCopiesInput(e: any) {
  const v = parseInt(e.detail.value);
  copies.value = isNaN(v) || v < 1 ? 1 : v;
}

function goAddAddress() {
  uni.navigateTo({ url: '/pages/address/edit/index?mode=create' });
}

function goSelectAddress() {
  uni.navigateTo({ url: '/pages/address/list/index?selectMode=1' });
}

// Called when returning from address selection
uni.$on('addressSelected', (addr: ShippingAddress) => {
  selectedAddress.value = addr;
});

async function handlePay() {
  if (!selectedAddress.value) {
    uni.showToast({ title: '请选择收货地址', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    await orderStore.create(paperId.value, 'print', copies.value, selectedAddress.value.id);
    uni.navigateTo({ url: '/pages/payment/index?type=print' });
  } catch (e: any) {
    uni.showToast({ title: e?.message ?? '创建订单失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <view class="checkout">
    <view class="header">
      <text class="header-title">打印服务 — 确认订单</text>
    </view>

    <!-- Paper Info -->
    <view class="card">
      <text class="paper-name">📄 {{ paperTitle || '试卷' }}</text>
      <text class="paper-meta" v-if="questionCount">{{ questionCount }} 题</text>
    </view>

    <!-- Copies -->
    <view class="card">
      <text class="section-label">打印份数</text>
      <view class="copies-input-row">
        <input class="copies-input" type="number" :value="copies" @input="onCopiesInput" />
        <text class="copies-unit">份</text>
      </view>
    </view>

    <!-- Pricing Tiers -->
    <view class="card" v-if="pricing?.print">
      <text class="section-label">分档计费</text>
      <view
        v-for="t in pricing.print"
        :key="t.tier"
        class="tier-row"
        :class="{ active: currentTier?.tier === t.tier }"
      >
        <text class="tier-range">
          {{ t.maxQuantity ? `${t.minQuantity}-${t.maxQuantity}份` : `${t.minQuantity}份以上` }}
        </text>
        <text class="tier-price">¥{{ (t.unitPrice / 100).toFixed(2) }} / 份</text>
        <text v-if="currentTier?.tier === t.tier" class="tier-badge">当前</text>
      </view>
    </view>

    <!-- Address -->
    <view class="card">
      <text class="section-label">收货地址</text>
      <view v-if="selectedAddress" class="address-card" @tap="goSelectAddress">
        <view class="addr-top">
          <text class="addr-name">{{ selectedAddress.receiverName }}</text>
          <text class="addr-phone">{{ selectedAddress.phone }}</text>
          <text v-if="selectedAddress.isDefault" class="addr-default">默认</text>
        </view>
        <text class="addr-detail">{{ selectedAddress.province }}{{ selectedAddress.city }}{{ selectedAddress.district }}{{ selectedAddress.detail }}</text>
      </view>
      <view v-else class="no-address" @tap="goAddAddress">
        <text>+ 新增收货地址</text>
      </view>
    </view>

    <!-- Total -->
    <view class="total-bar">
      <text class="total-label">
        {{ copies }}份 × ¥{{ currentTier ? (currentTier.unitPrice / 100).toFixed(2) : '—' }}/份
      </text>
      <text class="total-amount">¥{{ (totalPrice / 100).toFixed(2) }}</text>
    </view>

    <button
      class="btn-pay"
      :loading="loading"
      :disabled="!selectedAddress"
      @tap="handlePay"
    >
      确认支付 ¥{{ (totalPrice / 100).toFixed(2) }}
    </button>
  </view>
</template>

<style scoped>
.checkout { min-height: 100vh; padding: 20rpx 30rpx 140rpx; background: #f5f5f5; }
.header { padding: 20rpx 0; }
.header-title { font-size: 34rpx; font-weight: 600; }
.card { background: #fff; border-radius: 16rpx; padding: 28rpx; margin-bottom: 20rpx; }
.paper-name { font-size: 32rpx; font-weight: 500; display: block; }
.paper-meta { font-size: 24rpx; color: #999; margin-top: 8rpx; display: block; }
.section-label { font-size: 26rpx; color: #888; margin-bottom: 16rpx; display: block; }

/* Copies */
.copies-input-row { display: flex; align-items: center; gap: 12rpx; }
.copies-input { width: 200rpx; height: 80rpx; border: 2rpx solid #d9d9d9; border-radius: 10rpx; text-align: center; font-size: 40rpx; font-weight: 700; color: #333; }
.copies-input:focus { border-color: #1677ff; }
.copies-unit { font-size: 28rpx; color: #666; }

/* Tiers */
.tier-row { display: flex; align-items: center; padding: 14rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.tier-row:last-child { border-bottom: none; }
.tier-row.active { background: #f0f5ff; margin: 0 -12rpx; padding: 14rpx 12rpx; border-radius: 8rpx; }
.tier-range { flex: 1; font-size: 28rpx; }
.tier-price { font-size: 28rpx; color: #ff4d4f; margin: 0 12rpx; }
.tier-badge { font-size: 22rpx; background: #1677ff; color: #fff; padding: 2rpx 12rpx; border-radius: 20rpx; }

/* Address */
.address-card { padding: 4rpx 0; }
.address-card:active { opacity: 0.7; }
.addr-top { display: flex; align-items: center; gap: 16rpx; margin-bottom: 10rpx; }
.addr-name { font-size: 30rpx; font-weight: 500; }
.addr-phone { font-size: 28rpx; color: #666; }
.addr-default { font-size: 20rpx; background: #fff7e6; color: #fa8c16; padding: 2rpx 10rpx; border-radius: 4rpx; }
.addr-detail { font-size: 26rpx; color: #888; line-height: 1.4; display: block; }
.no-address { text-align: center; padding: 30rpx; color: #1677ff; font-size: 28rpx; }
.no-address:active { opacity: 0.7; }

/* Total */
.total-bar { display: flex; justify-content: space-between; align-items: center; background: #fff; border-radius: 12rpx; padding: 24rpx 28rpx; margin: 20rpx 0; }
.total-label { font-size: 28rpx; color: #666; }
.total-amount { font-size: 40rpx; color: #ff4d4f; font-weight: 700; }

.btn-pay { width: 100%; height: 96rpx; line-height: 96rpx; background: #1677ff; color: #fff; font-size: 32rpx; border-radius: 12rpx; border: none; position: fixed; bottom: 30rpx; left: 30rpx; right: 30rpx; }
.btn-pay[disabled] { background: #ccc; }
</style>
