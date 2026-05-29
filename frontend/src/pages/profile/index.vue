<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { getUserStats } from '../../api';

const auth = useAuthStore();
const stats = ref({ totalPapers: 0, totalPaid: 0, todayRegenerates: 0 });

onMounted(async () => {
  try {
    const res = await getUserStats();
    stats.value = res.data;
  } catch { /* ignore */ }
});
</script>

<template>
  <view class="profile">
    <view class="user-card">
      <text class="nickname">{{ auth.user?.nickname ?? '教师用户' }}</text>
      <text class="role-tag" :class="auth.user?.role">{{ auth.user?.role === 'admin' ? '管理员' : '教师' }}</text>
    </view>

    <view class="stats">
      <view class="stat-item"><text class="stat-num">{{ stats.totalPapers }}</text><text class="stat-label">生成试卷</text></view>
      <view class="stat-item"><text class="stat-num">{{ stats.totalPaid }}</text><text class="stat-label">已支付</text></view>
      <view class="stat-item"><text class="stat-num">{{ stats.todayRegenerates }}/3</text><text class="stat-label">今日重生成</text></view>
    </view>

    <button v-if="auth.isAdmin" class="btn-admin" @tap="uni.navigateTo({ url: '/pages/admin/dashboard/index' })">管理后台</button>
    <button class="btn-logout" @tap="auth.logout()">退出登录</button>
  </view>
</template>

<style scoped>
.profile { padding: 30rpx; }
.user-card { background: #fff; border-radius: 12rpx; padding: 40rpx; text-align: center; margin-bottom: 24rpx; }
.nickname { font-size: 36rpx; font-weight: bold; display: block; margin-bottom: 12rpx; }
.role-tag { display: inline-block; font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 4rpx; background: #f0f0f0; color: #666; }
.role-tag.admin { background: #fff7e6; color: #fa8c16; }
.stats { display: flex; background: #fff; border-radius: 12rpx; padding: 30rpx; margin-bottom: 30rpx; }
.stat-item { flex: 1; text-align: center; }
.stat-num { font-size: 40rpx; font-weight: bold; color: #1677ff; display: block; margin-bottom: 8rpx; }
.stat-label { font-size: 24rpx; color: #999; }
.btn-admin { background: #fff; color: #1677ff; border: 1px solid #1677ff; border-radius: 12rpx; height: 80rpx; line-height: 80rpx; margin-bottom: 20rpx; }
.btn-logout { background: #fff; color: #ff4d4f; border: 1px solid #ff4d4f; border-radius: 12rpx; height: 80rpx; line-height: 80rpx; }
</style>
