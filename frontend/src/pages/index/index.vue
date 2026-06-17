<script setup lang="ts">
import { useAuthStore } from '../../stores/auth';
import { usePaperStore } from '../../stores/paper';

const auth = useAuthStore();
const paper = usePaperStore();

function handleStart() {
  if (!auth.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/index' });
    return;
  }
  uni.navigateTo({ url: '/pages/paper/config/index' });
}

function handleAdmin() {
  uni.navigateTo({ url: '/pages/admin/dashboard/index' });
}

function handleUpload() {
  if (!auth.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/index' });
    return;
  }
  uni.navigateTo({ url: '/pages/contribute/upload/index' });
}
</script>

<template>
  <view class="home">
    <view class="hero">
      <text class="title">AI 智能组卷</text>
      <text class="subtitle">30秒生成一份试卷</text>
    </view>
    <view class="actions">
      <button class="btn-primary" @tap="handleStart">开始组卷</button>
      <button v-if="!auth.isAdmin" class="btn-secondary" @tap="handleUpload">上传题目</button>
      <button v-if="auth.isAdmin" class="btn-secondary" @tap="handleAdmin">管理后台</button>
    </view>
    <view class="features">
      <view class="feature-item"><text>AI智能生成</text></view>
      <view class="feature-item"><text>多学科支持</text></view>
      <view class="feature-item"><text>一键导出</text></view>
    </view>
  </view>
</template>

<style scoped>
.home { display: flex; flex-direction: column; align-items: center; padding: 80rpx 40rpx; }
.hero { text-align: center; margin-bottom: 80rpx; }
.title { font-size: 48rpx; font-weight: bold; display: block; margin-bottom: 16rpx; }
.subtitle { font-size: 28rpx; color: #666; }
.actions { width: 100%; display: flex; flex-direction: column; gap: 20rpx; margin-bottom: 60rpx; }
.btn-primary { background: #1677ff; color: #fff; border-radius: 12rpx; height: 88rpx; line-height: 88rpx; }
.btn-secondary { background: #fff; color: #1677ff; border: 1px solid #1677ff; border-radius: 12rpx; height: 88rpx; line-height: 88rpx; }
.features { display: flex; gap: 40rpx; }
.feature-item { padding: 20rpx 32rpx; background: #fff; border-radius: 8rpx; font-size: 24rpx; color: #888; }
</style>
