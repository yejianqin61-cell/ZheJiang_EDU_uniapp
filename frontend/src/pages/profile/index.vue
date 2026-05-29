<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { getUserStats } from '../../api';

const auth = useAuthStore();
const stats = ref({ totalPapers: 0, totalPaid: 0, todayRegenerates: 0 });
const statsLoaded = ref(false);

onMounted(async () => {
  try {
    const res = await getUserStats();
    stats.value = res.data;
  } finally {
    statsLoaded.value = true;
  }
});

function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    success: (res) => { if (res.confirm) auth.logout(); },
  });
}
</script>

<template>
  <view class="profile-page">
    <!-- User Header -->
    <view class="user-header">
      <view class="avatar">
        <text v-if="auth.user?.avatarUrl" class="avatar-text">&#x1F468;</text>
        <text v-else class="avatar-text">&#x1F464;</text>
      </view>
      <view class="user-info">
        <text class="nickname">{{ auth.user?.nickname ?? '教师用户' }}</text>
        <view class="role-row">
          <text class="role-badge" :class="auth.user?.role">
            {{ auth.user?.role === 'admin' ? '管理员' : '教师' }}
          </text>
        </view>
      </view>
    </view>

    <!-- Stats -->
    <view class="stats-row">
      <view class="stat-card">
        <text class="stat-num">{{ statsLoaded ? stats.totalPapers : '-' }}</text>
        <text class="stat-label">生成试卷</text>
      </view>
      <view class="stat-card">
        <text class="stat-num">{{ statsLoaded ? stats.totalPaid : '-' }}</text>
        <text class="stat-label">已支付</text>
      </view>
      <view class="stat-card">
        <text class="stat-num">{{ statsLoaded ? `${stats.todayRegenerates}/3` : '-' }}</text>
        <text class="stat-label">今日重生成</text>
      </view>
    </view>

    <!-- Menu -->
    <view class="menu-section">
      <view v-if="auth.isAdmin" class="menu-item" @tap="uni.navigateTo({ url: '/pages/admin/dashboard/index' })">
        <text class="menu-icon">&#x2699;</text>
        <text class="menu-text">管理后台</text>
        <text class="menu-arrow">&#8250;</text>
      </view>
      <view class="menu-item" @tap="handleLogout">
        <text class="menu-icon logout-icon">&#x21AA;</text>
        <text class="menu-text logout-text">退出登录</text>
        <text class="menu-arrow">&#8250;</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.user-header {
  display: flex;
  align-items: center;
  padding: 60rpx 40rpx 40rpx;
  background: linear-gradient(135deg, #1677ff 0%, #4096ff 100%);
}

.avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 56rpx;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 28rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.4);
}

.avatar-text {
  font-size: 48rpx;
}

.user-info {
  flex: 1;
}

.nickname {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #fff;
  margin-bottom: 10rpx;
}

.role-row {
  display: flex;
}

.role-badge {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 4rpx;
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}

.role-badge.admin {
  background: rgba(255, 255, 255, 0.35);
}

.stats-row {
  display: flex;
  margin: -36rpx 30rpx 24rpx;
  position: relative;
  z-index: 1;
  gap: 16rpx;
}

.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx 16rpx;
  text-align: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.stat-num {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #1677ff;
  margin-bottom: 6rpx;
}

.stat-label {
  font-size: 22rpx;
  color: #999;
}

.menu-section {
  margin: 0 30rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 32rpx 28rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-icon {
  font-size: 36rpx;
  width: 52rpx;
}

.logout-icon {
  color: #ff4d4f;
}

.menu-text {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.logout-text {
  color: #ff4d4f;
}

.menu-arrow {
  font-size: 32rpx;
  color: #ccc;
}
</style>
