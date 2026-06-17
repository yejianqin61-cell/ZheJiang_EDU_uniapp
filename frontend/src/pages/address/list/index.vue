<script setup lang="ts">
import { ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { getShippingAddresses, deleteShippingAddress } from '../../../api';
import type { ShippingAddress } from '../../../types';

const addresses = ref<ShippingAddress[]>([]);
const selectMode = ref(false);

onLoad((options) => {
  selectMode.value = options?.selectMode === '1';
});

onShow(async () => {
  await fetchAddresses();
});

async function fetchAddresses() {
  try {
    const res = await getShippingAddresses();
    addresses.value = (res.data ?? []) as ShippingAddress[];
  } catch { /* handle error */ }
}

function handleTapAddress(addr: ShippingAddress) {
  if (selectMode.value) {
    uni.$emit('addressSelected', addr);
    uni.navigateBack();
  } else {
    goEdit(addr.id);
  }
}

function goEdit(id?: string) {
  uni.navigateTo({ url: `/pages/address/edit/index?mode=edit&id=${id ?? ''}` });
}

function goCreate() {
  uni.navigateTo({ url: '/pages/address/edit/index?mode=create' });
}

async function handleDelete(id: string) {
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '确认删除',
      content: '确定要删除该地址吗？',
      success: (r) => resolve(r.confirm),
    });
  });
  if (!confirmed) return;

  const backup = addresses.value.find(a => a.id === id);
  addresses.value = addresses.value.filter(a => a.id !== id);

  try {
    await deleteShippingAddress(id);
  } catch {
    if (backup) addresses.value.push(backup);
    uni.showToast({ title: '删除失败', icon: 'none' });
  }
}
</script>

<template>
  <view class="addr-list">
    <!-- Add button always visible at top -->
    <view class="add-btn" @tap="goCreate">+ 新增收货地址</view>

    <view v-if="addresses.length === 0" class="empty">暂无收货地址，请新增</view>

    <view
      v-for="addr in addresses"
      :key="addr.id"
      class="addr-card"
      :class="{ selectable: selectMode }"
      @tap="handleTapAddress(addr)"
    >
      <view class="addr-top">
        <text class="addr-name">{{ addr.receiverName }}</text>
        <text class="addr-phone">{{ addr.phone }}</text>
        <text v-if="addr.isDefault" class="addr-default">默认</text>
      </view>
      <text class="addr-detail">{{ addr.province }}{{ addr.city }}{{ addr.district }}{{ addr.detail }}</text>
      <view v-if="!selectMode" class="addr-actions">
        <text class="action-edit" @tap.stop="goEdit(addr.id)">编辑</text>
        <text class="action-delete" @tap.stop="handleDelete(addr.id)">删除</text>
      </view>
      <view v-else class="select-indicator">
        <text class="select-text">点击选择</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.addr-list { padding: 20rpx 30rpx; min-height: 100vh; background: #f5f5f5; }
.empty { text-align: center; padding: 200rpx 0; color: #999; font-size: 28rpx; }
.addr-card { background: #fff; border-radius: 12rpx; padding: 28rpx; margin-bottom: 20rpx; }
.addr-card.selectable:active { background: #f0f5ff; }
.addr-top { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.addr-name { font-size: 32rpx; font-weight: 500; }
.addr-phone { font-size: 28rpx; color: #666; }
.addr-default { font-size: 20rpx; background: #fff7e6; color: #fa8c16; padding: 2rpx 10rpx; border-radius: 4rpx; }
.addr-detail { font-size: 26rpx; color: #888; line-height: 1.4; display: block; }
.addr-actions { display: flex; gap: 30rpx; margin-top: 16rpx; justify-content: flex-end; }
.action-edit { font-size: 26rpx; color: #1677ff; }
.action-delete { font-size: 26rpx; color: #ff4d4f; }
.select-indicator { text-align: right; margin-top: 12rpx; }
.select-text { font-size: 24rpx; color: #1677ff; }
.add-btn { text-align: center; padding: 24rpx; background: #fff; border-radius: 12rpx; color: #1677ff; font-size: 30rpx; border: 2rpx dashed #1677ff; margin-bottom: 20rpx; }
</style>
