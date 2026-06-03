<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getAdminFiles } from '../../../../api';

interface FileItem {
  fileId: string;
  filename: string;
  fileType: string;
  subject: string;
  grade: string;
  status: string;
  questionCount: number;
  errorMsg?: string;
  createdAt: string;
}

const files = ref<FileItem[]>([]);
const loading = ref(true);
const statusFilter = ref('');

const statusMap: Record<string, string> = {
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
};

async function loadFiles() {
  loading.value = true;
  try {
    const res = await getAdminFiles(1, 50, statusFilter.value || undefined);
    files.value = res.data.list ?? [];
  } finally {
    loading.value = false;
  }
}

function formatTime(ts: string) {
  return ts?.replace('T', ' ').substring(0, 19) ?? '';
}

onMounted(loadFiles);
</script>

<template>
  <view class="page">
    <view class="header">
      <text class="title">上传记录</text>
      <view class="filters">
        <view class="filter-tag" :class="{ active: statusFilter === '' }" @tap="statusFilter=''; loadFiles()">全部</view>
        <view class="filter-tag" :class="{ active: statusFilter === 'processing' }" @tap="statusFilter='processing'; loadFiles()">处理中</view>
        <view class="filter-tag" :class="{ active: statusFilter === 'completed' }" @tap="statusFilter='completed'; loadFiles()">已完成</view>
        <view class="filter-tag" :class="{ active: statusFilter === 'failed' }" @tap="statusFilter='failed'; loadFiles()">失败</view>
      </view>
    </view>

    <view v-if="loading" class="loading">加载中...</view>

    <view v-else-if="files.length === 0" class="empty">暂无上传记录</view>

    <view v-else class="file-list">
      <view v-for="f in files" :key="f.fileId" class="file-card">
        <view class="file-row">
          <text class="file-name">{{ f.filename }}</text>
          <text class="file-status" :class="f.status">{{ statusMap[f.status] ?? f.status }}</text>
        </view>
        <view class="file-meta">
          <text>{{ f.subject }} · {{ f.grade }} · .{{ f.fileType }}</text>
          <text v-if="f.status === 'completed'"> · {{ f.questionCount }} 题</text>
        </view>
        <view v-if="f.status === 'failed' && f.errorMsg" class="file-error">{{ f.errorMsg }}</view>
        <view class="file-time">{{ formatTime(f.createdAt) }}</view>
        <view v-if="f.status === 'completed'" class="file-action" @tap="uni.navigateTo({ url: `/pages/admin/review/index?fileId=${f.fileId}` })">
          查看题目 →
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 20rpx 30rpx; }
.header { margin-bottom: 20rpx; }
.title { font-size: 36rpx; font-weight: bold; display: block; margin-bottom: 20rpx; }
.filters { display: flex; gap: 16rpx; }
.filter-tag { padding: 10rpx 24rpx; background: #f0f0f0; border-radius: 20rpx; font-size: 24rpx; }
.filter-tag.active { background: #1677ff; color: #fff; }
.loading, .empty { text-align: center; padding: 80rpx 0; color: #999; font-size: 28rpx; }
.file-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; }
.file-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.file-name { font-size: 28rpx; font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-status { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 12rpx; }
.file-status.completed { background: #e6f7e9; color: #52c41a; }
.file-status.processing { background: #e6f0ff; color: #1677ff; }
.file-status.failed { background: #fff0f0; color: #ff4d4f; }
.file-meta { font-size: 24rpx; color: #888; margin-bottom: 4rpx; }
.file-error { font-size: 22rpx; color: #ff4d4f; background: #fff0f0; padding: 8rpx 12rpx; border-radius: 8rpx; margin: 8rpx 0; }
.file-time { font-size: 22rpx; color: #bbb; }
.file-action { font-size: 24rpx; color: #1677ff; margin-top: 12rpx; }
</style>
