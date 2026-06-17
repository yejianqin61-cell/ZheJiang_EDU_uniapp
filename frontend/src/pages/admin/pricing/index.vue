<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getAdminPricing, updateAdminPricing } from '../../../api';
import type { PricingConfig } from '../../../types';

const pricing = ref<PricingConfig & { cashback?: { unitPrice: number; description: string } }>({
  download: { unitPrice: 200, description: '按题计费' },
  print: [],
  cashback: { unitPrice: 100, description: '教师贡献题通过审核，每题返现' },
});
const saving = ref(false);
const loading = ref(true);

onMounted(async () => {
  try {
    const res = await getAdminPricing();
    pricing.value = res.data;
  } catch { /* use defaults */ }
  loading.value = false;
});

function onDownloadPriceChange(e: any) {
  pricing.value.download.unitPrice = Math.round(parseFloat(e.detail.value) * 100);
}

function onCashbackPriceChange(e: any) {
  if (pricing.value.cashback) pricing.value.cashback.unitPrice = Math.round(parseFloat(e.detail.value) * 100);
}

function onPrintPriceChange(tier: number, e: any) {
  const t = pricing.value.print.find((p) => p.tier === tier);
  if (t) t.unitPrice = Math.round(parseFloat(e.detail.value) * 100);
}

function onPrintMaxChange(tier: number, e: any) {
  const t = pricing.value.print.find((p) => p.tier === tier);
  if (t) {
    t.maxQuantity = e.detail.value ? parseInt(e.detail.value) : null;
    syncTiers();
  }
}

function syncTiers() {
  const tiers = pricing.value.print;
  if (tiers.length < 3) return;
  // Tier 1 max → Tier 2 min
  if (tiers[0].maxQuantity) tiers[1].minQuantity = tiers[0].maxQuantity + 1;
  // Tier 2 max → Tier 3 min
  if (tiers[1].maxQuantity) tiers[2].minQuantity = tiers[1].maxQuantity + 1;
}

async function handleSave() {
  // Confirm
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '确认修改定价',
      content: '修改定价后仅对新订单生效，已有订单不受影响。确定保存吗？',
      success: (r) => resolve(r.confirm),
    });
  });
  if (!confirmed) return;

  saving.value = true;
  try {
    const downloadPrice = pricing.value.download.unitPrice;
    const printTiers = pricing.value.print.map((t) => ({
      tier: t.tier,
      minQuantity: t.minQuantity,
      maxQuantity: t.maxQuantity,
      unitPrice: t.unitPrice,
    }));

    const cashbackPrice = pricing.value.cashback?.unitPrice ?? 100;

    await updateAdminPricing({
      download: { unitPrice: downloadPrice },
      print: printTiers,
      cashback: { unitPrice: cashbackPrice },
    });
    uni.showToast({ title: '定价已更新', icon: 'success' });
  } catch (e: any) {
    uni.showToast({ title: e?.message ?? '更新失败', icon: 'none' });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <view class="pricing-page" v-if="!loading">
    <!-- Download Pricing -->
    <view class="card">
      <text class="section-title">下载服务（按题计费）</text>
      <view class="price-row">
        <text class="price-label">单题价格</text>
        <view class="price-input-row">
          <input
            class="price-input"
            type="digit"
            :value="(pricing.download.unitPrice / 100).toFixed(2)"
            @blur="onDownloadPriceChange"
          />
          <text class="price-unit">元 / 题</text>
        </view>
      </view>
      <text class="example-text">示例: 20题试卷 = ¥{{ ((pricing.download.unitPrice * 20) / 100).toFixed(2) }}</text>
    </view>

    <!-- Cashback Pricing -->
    <view class="card" v-if="pricing.cashback">
      <text class="section-title">返现配置（教师贡献题）</text>
      <view class="price-row">
        <text class="price-label">每题返现</text>
        <view class="price-input-row">
          <input
            class="price-input"
            type="digit"
            :value="((pricing.cashback.unitPrice) / 100).toFixed(2)"
            @blur="onCashbackPriceChange"
          />
          <text class="price-unit">元 / 题</text>
        </view>
      </view>
      <text class="example-text">教师贡献题通过审核后，每题返现此金额到余额</text>
    </view>

    <!-- Print Pricing -->
    <view class="card" v-if="pricing.print.length > 0">
      <text class="section-title">打印服务（分档计费）</text>
      <view v-for="(tier, idx) in pricing.print" :key="tier.tier" class="tier-section">
        <text class="tier-label">第{{ tier.tier }}档</text>
        <view class="tier-inputs">
          <view class="tier-range-group">
            <text class="tier-hint" v-if="idx === 0">1</text>
            <text class="tier-hint" v-else>{{ tier.minQuantity }}</text>
            <text class="tier-sep"> ~ </text>
            <input
              v-if="idx < 2"
              class="tier-max-input"
              type="number"
              :value="tier.maxQuantity ?? ''"
              @blur="(e: any) => onPrintMaxChange(tier.tier, e)"
            />
            <text v-else class="tier-unlimited">上不封顶</text>
            <text class="tier-unit">份</text>
          </view>
          <view class="tier-price-group">
            <text class="tier-prefix">单价</text>
            <input
              class="price-input tier-price-input"
              type="digit"
              :value="(tier.unitPrice / 100).toFixed(2)"
              @blur="(e: any) => onPrintPriceChange(tier.tier, e)"
            />
            <text class="price-unit">元 / 份</text>
          </view>
        </view>
      </view>
    </view>

    <button class="btn-save" :loading="saving" @tap="handleSave">保存配置</button>
  </view>
  <view v-else class="loading">加载中...</view>
</template>

<style scoped>
.pricing-page { padding: 20rpx 30rpx 100rpx; min-height: 100vh; background: #f5f5f5; }
.loading { text-align: center; padding: 200rpx 0; color: #999; }

.card { background: #fff; border-radius: 16rpx; padding: 32rpx 28rpx; margin-bottom: 24rpx; }
.section-title { font-size: 30rpx; font-weight: 600; color: #1a1a1a; display: block; margin-bottom: 24rpx; }

/* Download */
.price-row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; }
.price-label { font-size: 28rpx; color: #666; }
.price-input-row { display: flex; align-items: center; gap: 8rpx; }
.price-input { width: 140rpx; height: 60rpx; border: 1rpx solid #d9d9d9; border-radius: 8rpx; text-align: center; font-size: 30rpx; color: #ff4d4f; font-weight: 600; }
.price-unit { font-size: 24rpx; color: #999; }
.example-text { font-size: 24rpx; color: #bbb; margin-top: 16rpx; display: block; }

/* Print Tiers */
.tier-section { border-top: 1rpx solid #f0f0f0; padding: 20rpx 0; }
.tier-section:first-of-type { border-top: none; padding-top: 0; }
.tier-label { font-size: 26rpx; color: #1677ff; font-weight: 500; margin-bottom: 12rpx; display: block; }
.tier-inputs { display: flex; flex-direction: column; gap: 12rpx; }
.tier-range-group { display: flex; align-items: center; gap: 8rpx; }
.tier-hint { font-size: 28rpx; color: #333; min-width: 40rpx; }
.tier-sep { font-size: 28rpx; color: #999; }
.tier-max-input { width: 100rpx; height: 56rpx; border: 1rpx solid #d9d9d9; border-radius: 6rpx; text-align: center; font-size: 28rpx; }
.tier-unlimited { font-size: 28rpx; color: #52c41a; font-weight: 500; }
.tier-unit { font-size: 24rpx; color: #999; }
.tier-price-group { display: flex; align-items: center; gap: 8rpx; }
.tier-prefix { font-size: 26rpx; color: #888; }
.tier-price-input { width: 120rpx; height: 56rpx; }

.btn-save { width: 100%; height: 96rpx; line-height: 96rpx; background: #1677ff; color: #fff; font-size: 32rpx; border-radius: 12rpx; border: none; margin-top: 30rpx; }
</style>
