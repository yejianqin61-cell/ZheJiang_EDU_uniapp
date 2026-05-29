<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getAdminQuestions, deleteQuestion, batchDeleteQuestions } from '../../../api';
import type { QuestionDetail } from '../../../types';

const questions = ref<QuestionDetail[]>([]);
const page = ref(1);
const total = ref(0);
const keyword = ref('');
const selected = ref<Set<string>>(new Set());

onMounted(() => { fetchList(); });

async function fetchList() {
  const res = await getAdminQuestions({ page: page.value, pageSize: 20, keyword: keyword.value || undefined });
  questions.value = res.data.list;
  total.value = res.data.pagination.total;
}

async function handleDelete(id: string) {
  await deleteQuestion(id);
  fetchList();
}

async function handleBatchDelete() {
  await batchDeleteQuestions([...selected.value]);
  selected.value = new Set();
  fetchList();
}

function handleDetail(id: string) {
  uni.navigateTo({ url: `/pages/admin/questions/detail?id=${id}` });
}
</script>

<template>
  <view class="questions">
    <view class="search-bar">
      <input v-model="keyword" placeholder="搜索题目..." @confirm="fetchList" />
      <button @tap="fetchList">搜索</button>
    </view>

    <view v-for="q in questions" :key="q.id" class="q-row" @tap="handleDetail(q.id)">
      <text class="q-content">{{ q.content }}</text>
      <view class="q-meta">
        <text class="q-tag">{{ q.subject }}</text>
        <text class="q-tag">{{ q.grade }}</text>
        <text class="q-tag">{{ ['','简单','中等','困难'][q.difficulty] }}</text>
      </view>
      <button class="btn-del" @tap.stop="handleDelete(q.id)">删除</button>
    </view>
  </view>
</template>

<style scoped>
.questions { padding: 20rpx 30rpx; }
.search-bar { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.search-bar input { flex: 1; background: #fff; border-radius: 8rpx; padding: 16rpx; font-size: 28rpx; }
.search-bar button { background: #1677ff; color: #fff; border-radius: 8rpx; font-size: 26rpx; padding: 0 24rpx; }
.q-row { background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 16rpx; }
.q-content { font-size: 28rpx; display: block; margin-bottom: 12rpx; line-height: 1.4; }
.q-meta { display: flex; gap: 8rpx; }
.q-tag { font-size: 20rpx; background: #f0f0f0; color: #666; padding: 2rpx 12rpx; border-radius: 4rpx; }
.btn-del { margin-top: 12rpx; font-size: 22rpx; background: #fff; color: #ff4d4f; border: 1px solid #ff4d4f; border-radius: 6rpx; padding: 4rpx 16rpx; }
</style>
