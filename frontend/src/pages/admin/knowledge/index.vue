<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getKnowledgePointList } from '../../../api';
import type { KnowledgePoint } from '../../../types';

const list = ref<KnowledgePoint[]>([]);
const page = ref(1);
const total = ref(0);
const keyword = ref('');
const subject = ref('');
const grade = ref('');

onMounted(() => { fetchList(); });

async function fetchList() {
  const res = await getKnowledgePointList(page.value, 20, subject.value || undefined, grade.value || undefined, keyword.value || undefined);
  list.value = res.data.list;
  total.value = res.data.pagination.total;
}
</script>

<template>
  <view class="kp">
    <view class="search-bar">
      <input v-model="keyword" placeholder="搜索知识点..." @confirm="fetchList" />
      <button @tap="fetchList">搜索</button>
    </view>

    <view v-for="kp in list" :key="kp.id" class="kp-row">
      <view class="kp-info">
        <text class="kp-name">{{ kp.name }}</text>
        <text class="kp-meta">{{ kp.subject }} | {{ kp.grade }}</text>
      </view>
      <text class="kp-count">{{ kp.questionCount }}题</text>
    </view>
  </view>
</template>

<style scoped>
.kp { padding: 20rpx 30rpx; }
.search-bar { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.search-bar input { flex: 1; background: #fff; border-radius: 8rpx; padding: 16rpx; font-size: 28rpx; }
.search-bar button { background: #1677ff; color: #fff; border-radius: 8rpx; font-size: 26rpx; padding: 0 24rpx; }
.kp-row { display: flex; align-items: center; background: #fff; border-radius: 12rpx; padding: 20rpx 24rpx; margin-bottom: 12rpx; }
.kp-info { flex: 1; }
.kp-name { font-size: 28rpx; font-weight: 500; display: block; margin-bottom: 6rpx; }
.kp-meta { font-size: 22rpx; color: #999; }
.kp-count { font-size: 32rpx; font-weight: bold; color: #1677ff; }
</style>
