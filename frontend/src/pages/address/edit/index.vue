<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { createShippingAddress, updateShippingAddress, getShippingAddresses } from '../../../api';
import type { ShippingAddress } from '../../../types';

const mode = ref<'create' | 'edit'>('create');
const editId = ref('');
const saving = ref(false);

// Use individual refs instead of nested form object (WeChat compatibility)
const receiverName = ref('');
const phone = ref('');
const province = ref('');
const city = ref('');
const district = ref('');
const detail = ref('');
const isDefault = ref(false);

onLoad((options) => {
  mode.value = (options?.mode as any) ?? 'create';
  editId.value = options?.id ?? '';
});

onMounted(async () => {
  if (mode.value === 'edit' && editId.value) {
    try {
      const res = await getShippingAddresses();
      const list = (res.data ?? []) as ShippingAddress[];
      const addr = list.find((a) => a.id === editId.value);
      if (addr) {
        receiverName.value = addr.receiverName;
        phone.value = addr.phone;
        province.value = addr.province;
        city.value = addr.city;
        district.value = addr.district;
        detail.value = addr.detail;
        isDefault.value = addr.isDefault;
      }
    } catch { /* handle */ }
  }
});

function onRegionChange(e: any) {
  const [p, c, d] = e.detail.value;
  province.value = p;
  city.value = c;
  district.value = d;
}

async function handleSave() {
  if (!receiverName.value || !phone.value || !province.value || !detail.value) {
    uni.showToast({ title: '请填写完整信息（含省市区）', icon: 'none' });
    return;
  }
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    uni.showToast({ title: '手机号格式不正确', icon: 'none' });
    return;
  }
  saving.value = true;
  try {
    const data = {
      receiverName: receiverName.value,
      phone: phone.value,
      province: province.value,
      city: city.value,
      district: district.value,
      detail: detail.value,
      isDefault: isDefault.value,
    };
    if (mode.value === 'create') {
      await createShippingAddress(data);
    } else {
      await updateShippingAddress(editId.value, data);
    }
    uni.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 500);
  } catch (e: any) {
    const msg = e?.message ?? (typeof e === 'string' ? e : '保存失败');
    uni.showToast({ title: String(msg).slice(0, 40), icon: 'none' });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <view class="edit">
    <view class="form-group">
      <text class="label">收货人</text>
      <input class="input" v-model="receiverName" placeholder="请输入收货人姓名" maxlength="32" />
    </view>
    <view class="form-group">
      <text class="label">手机号</text>
      <input class="input" v-model="phone" placeholder="请输入手机号" type="number" maxlength="11" />
    </view>
    <view class="form-group">
      <text class="label">省</text>
      <input class="input" v-model="province" placeholder="请输入省份（必填）" maxlength="32" />
    </view>
    <view class="form-group">
      <text class="label">市</text>
      <input class="input" v-model="city" placeholder="请输入城市" maxlength="32" />
    </view>
    <view class="form-group">
      <text class="label">区/县</text>
      <input class="input" v-model="district" placeholder="请输入区县" maxlength="32" />
    </view>
    <view class="form-group">
      <text class="label">详细地址</text>
      <textarea class="input textarea" v-model="detail" placeholder="街道、门牌号等" maxlength="256" />
    </view>
    <view class="form-group row">
      <text class="label">设为默认地址</text>
      <switch :checked="isDefault" @change="(e: any) => isDefault = e.detail.value" />
    </view>
    <button class="btn-save" :loading="saving" @tap="handleSave">
      {{ mode === 'create' ? '保存' : '更新' }}
    </button>
  </view>
</template>

<style scoped>
.edit { padding: 30rpx; min-height: 100vh; background: #f5f5f5; }
.form-group { background: #fff; border-radius: 12rpx; padding: 24rpx 28rpx; margin-bottom: 16rpx; }
.form-group.row { display: flex; justify-content: space-between; align-items: center; }
.label { font-size: 28rpx; color: #888; margin-bottom: 12rpx; display: block; }
.label:last-child { margin-bottom: 0; }
.input { font-size: 30rpx; height: 60rpx; width: 100%; }
.textarea { height: 120rpx; }
.picker-value { font-size: 30rpx; color: #333; height: 60rpx; line-height: 60rpx; }
.btn-save { width: 100%; height: 96rpx; line-height: 96rpx; background: #1677ff; color: #fff; font-size: 32rpx; border-radius: 12rpx; border: none; margin-top: 40rpx; }
</style>
