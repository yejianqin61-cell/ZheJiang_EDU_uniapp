<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();
const loading = ref(false);
const errorMsg = ref('');

async function handleLogin() {
  if (loading.value) return;
  loading.value = true;
  errorMsg.value = '';
  try {
    await auth.login();
    uni.showToast({ title: '登录成功', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 600);
  } catch (e: any) {
    errorMsg.value = e?.message ?? '登录失败，请重试';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <view class="login-page">
    <view class="header">
      <view class="logo-icon">AI</view>
      <text class="app-title">AI 智能组卷</text>
      <text class="app-desc">浙江省中小学教师组卷平台</text>
    </view>

    <view class="card">
      <view class="card-icon">&#x1F4DD;</view>
      <text class="card-title">微信一键登录</text>
      <text class="card-hint">授权后自动创建账号</text>

      <button
        class="login-btn"
        :class="{ loading }"
        :disabled="loading"
        @tap="handleLogin"
      >
        {{ loading ? '登录中...' : '微信授权登录' }}
      </button>

      <text v-if="errorMsg" class="error-msg">{{ errorMsg }}</text>
    </view>

    <text class="footer-text">首次登录即表示同意《用户服务协议》</text>
  </view>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 50rpx;
  background: linear-gradient(180deg, #e8f0fe 0%, #f5f5f5 60%);
}

.header {
  text-align: center;
  margin-bottom: 80rpx;
}

.logo-icon {
  width: 120rpx;
  height: 120rpx;
  line-height: 120rpx;
  margin: 0 auto 32rpx;
  background: #1677ff;
  color: #fff;
  font-size: 40rpx;
  font-weight: bold;
  letter-spacing: 2rpx;
  border-radius: 28rpx;
  box-shadow: 0 8rpx 24rpx rgba(22, 119, 255, 0.3);
}

.app-title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 12rpx;
}

.app-desc {
  font-size: 26rpx;
  color: #888;
}

.card {
  width: 100%;
  background: #fff;
  border-radius: 24rpx;
  padding: 56rpx 40rpx 40rpx;
  text-align: center;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
}

.card-icon {
  font-size: 64rpx;
  margin-bottom: 20rpx;
}

.card-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
}

.card-hint {
  display: block;
  font-size: 24rpx;
  color: #aaa;
  margin-bottom: 48rpx;
}

.login-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: #07c160;
  color: #fff;
  font-size: 32rpx;
  font-weight: 500;
  border-radius: 48rpx;
  border: none;
}

.login-btn.loading {
  opacity: 0.7;
}

.error-msg {
  display: block;
  margin-top: 24rpx;
  font-size: 24rpx;
  color: #ff4d4f;
}

.footer-text {
  margin-top: 48rpx;
  font-size: 22rpx;
  color: #bbb;
}
</style>
