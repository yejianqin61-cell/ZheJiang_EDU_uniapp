<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { login as apiLogin } from '../../api';

const auth = useAuthStore();
const loading = ref(false);
const errorMsg = ref('');
const devCode = ref('admin_test');
const isH5 = ref(false);

// #ifdef H5
isH5.value = true;
// #endif

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

async function handleDevLogin() {
  if (loading.value || !devCode.value.trim()) return;
  loading.value = true;
  errorMsg.value = '';
  try {
    const res = await apiLogin(devCode.value.trim());
    uni.setStorageSync('accessToken', res.data.accessToken);
    auth.token = res.data.accessToken;
    auth.user = res.data.user;
    uni.showToast({ title: '登录成功', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 600);
  } catch (e: any) {
    errorMsg.value = e?.message ?? '登录失败';
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

    <!-- Dev login (H5 / non-WeChat env) -->
    <view class="dev-card">
      <text class="dev-title">Dev 登录（H5/测试用）</text>
      <input class="dev-input" v-model="devCode" placeholder="输入用户名 (admin_test 或 test_user)" />
      <button class="dev-btn" :disabled="loading" @tap="handleDevLogin">
        {{ loading ? '登录中...' : 'Dev 登录' }}
      </button>
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

.dev-card {
  width: 100%;
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  margin-top: 30rpx;
  text-align: center;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
}
.dev-title { font-size: 24rpx; color: #999; display: block; margin-bottom: 20rpx; }
.dev-input {
  border: 1px solid #e0e0e0;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  text-align: center;
  margin-bottom: 20rpx;
}
.dev-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background: #1677ff;
  color: #fff;
  font-size: 28rpx;
  border-radius: 40rpx;
  border: none;
}

.footer-text {
  margin-top: 48rpx;
  font-size: 22rpx;
  color: #bbb;
}
</style>
