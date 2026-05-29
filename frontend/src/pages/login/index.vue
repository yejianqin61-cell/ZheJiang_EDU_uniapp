<script setup lang="ts">
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();

async function handleLogin() {
  try {
    await auth.login();
    uni.showToast({ title: '登录成功', icon: 'success' });
    uni.navigateBack();
  } catch {
    uni.showToast({ title: '登录失败，请重试', icon: 'none' });
  }
}
</script>

<template>
  <view class="login">
    <view class="logo-area">
      <text class="app-name">AI智能组卷</text>
      <text class="slogan">浙江省中小学教师组卷平台</text>
    </view>
    <button class="wx-login-btn" @tap="handleLogin">微信授权登录</button>
  </view>
</template>

<style scoped>
.login { display: flex; flex-direction: column; align-items: center; padding-top: 200rpx; }
.logo-area { text-align: center; margin-bottom: 120rpx; }
.app-name { font-size: 52rpx; font-weight: bold; display: block; margin-bottom: 16rpx; }
.slogan { font-size: 28rpx; color: #999; }
.wx-login-btn { width: 600rpx; height: 96rpx; line-height: 96rpx; background: #07c160; color: #fff; border-radius: 48rpx; font-size: 32rpx; }
</style>
