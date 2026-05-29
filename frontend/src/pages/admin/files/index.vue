<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getAdminFiles, deleteFile } from '../../../api';
import type { KbFileItem } from '../../../types';

const files = ref<KbFileItem[]>([]);
const page = ref(1);
const total = ref(0);

onMounted(() => { fetchList(); });

async function fetchList() {
  const res = await getAdminFiles(page.value, 20);
  files.value = res.data.list;
  total.value = res.data.pagination.total;
}

async function handleDelete(fileId: string) {
  await deleteFile(fileId);
  fetchList();
}
</script>

<template>
  <view class="files">
    <view v-for="f in files" :key="f.fileId" class="file-row">
      <view class="file-info">
        <text class="file-name">{{ f.filename }}</text>
        <text class="file-meta">{{ f.subject }} {{ f.grade }} | {{ f.status }} | {{ f.questionCount }}题</text>
      </view>
      <button class="btn-del" @tap="handleDelete(f.fileId)">删除</button>
    </view>
  </view>
</template>

<style scoped>
.files { padding: 20rpx 30rpx; }
.file-row { display: flex; align-items: center; background: #fff; border-radius: 12rpx; padding: 20rpx 24rpx; margin-bottom: 12rpx; }
.file-info { flex: 1; }
.file-name { font-size: 28rpx; display: block; margin-bottom: 6rpx; }
.file-meta { font-size: 22rpx; color: #999; }
.btn-del { font-size: 22rpx; background: #fff; color: #ff4d4f; border: 1px solid #ff4d4f; border-radius: 6rpx; padding: 4rpx 16rpx; }
</style>
