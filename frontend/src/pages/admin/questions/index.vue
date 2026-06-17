<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { getAdminQuestions, deleteQuestion, batchDeleteQuestions } from '../../../api';
import type { QuestionDetail } from '../../../types';

const SUBJECTS = ['全部', '语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理'];
const GRADES = ['全部', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '七年级', '八年级', '九年级', '高一', '高二', '高三'];

const questions = ref<QuestionDetail[]>([]);
const page = ref(1);
const total = ref(0);
const keyword = ref('');
const subject = ref('');
const grade = ref('');
const selected = ref<Set<string>>(new Set());

const subjectIndex = computed({
  get: () => subject.value ? SUBJECTS.indexOf(subject.value) : 0,
  set: (i: number) => { subject.value = i === 0 ? '' : SUBJECTS[i]; page.value = 1; fetchList(); },
});
const gradeIndex = computed({
  get: () => grade.value ? GRADES.indexOf(grade.value) : 0,
  set: (i: number) => { grade.value = i === 0 ? '' : GRADES[i]; page.value = 1; fetchList(); },
});

onMounted(() => { fetchList(); });

async function fetchList() {
  const res = await getAdminQuestions({
    page: page.value, pageSize: 20,
    subject: subject.value || undefined,
    grade: grade.value || undefined,
    keyword: keyword.value || undefined,
  });
  questions.value = res.data.list;
  total.value = res.data.pagination.total;
}

function onSearch() { page.value = 1; fetchList(); }
function onReset() { subject.value = ''; grade.value = ''; keyword.value = ''; page.value = 1; fetchList(); }

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
  uni.navigateTo({ url: `/pages/admin/questions/detail/index?id=${id}` });
}
</script>

<template>
  <view class="questions">
    <!-- 筛选栏 -->
    <view class="filter-bar">
      <picker :value="subjectIndex" :range="SUBJECTS" @change="(e: any) => subjectIndex = e.detail.value">
        <view class="picker-item">{{ subject.value || '学科' }}</view>
      </picker>
      <picker :value="gradeIndex" :range="GRADES" @change="(e: any) => gradeIndex = e.detail.value">
        <view class="picker-item">{{ grade.value || '年级' }}</view>
      </picker>
      <button class="btn-reset" @tap="onReset">重置</button>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <input v-model="keyword" placeholder="搜索题目..." @confirm="onSearch" />
      <button @tap="onSearch">搜索</button>
    </view>

    <!-- 统计 -->
    <view class="stats">共 {{ total }} 题</view>

    <!-- 列表 -->
    <view v-for="q in questions" :key="q.id" class="q-row" @tap="handleDetail(q.id)">
      <text class="q-content">{{ q.content }}</text>
      <view class="q-meta">
        <text class="q-tag">{{ q.subject }}</text>
        <text class="q-tag">{{ q.grade }}</text>
        <text class="q-tag">{{ ['','简单','中等','困难'][q.difficulty] || '?' }}</text>
        <text class="q-tag">{{ q.type }}</text>
      </view>
      <button class="btn-del" @tap.stop="handleDelete(q.id)">删除</button>
    </view>

    <view v-if="questions.length === 0" class="empty">暂无题目</view>
  </view>
</template>

<style scoped>
.questions { padding: 20rpx 30rpx; }
.filter-bar { display: flex; gap: 16rpx; margin-bottom: 16rpx; align-items: center; }
.picker-item {
  background: #fff; border-radius: 8rpx; padding: 14rpx 28rpx; font-size: 26rpx;
  color: #333; border: 1px solid #e0e0e0; min-width: 120rpx; text-align: center;
}
.btn-reset { font-size: 24rpx; background: #fff; color: #999; border: 1px solid #e0e0e0; border-radius: 8rpx; padding: 8rpx 20rpx; }
.search-bar { display: flex; gap: 16rpx; margin-bottom: 12rpx; }
.search-bar input { flex: 1; background: #fff; border-radius: 8rpx; padding: 16rpx; font-size: 28rpx; }
.search-bar button { background: #1677ff; color: #fff; border-radius: 8rpx; font-size: 26rpx; padding: 0 24rpx; }
.stats { font-size: 24rpx; color: #999; margin-bottom: 16rpx; }
.q-row { background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 16rpx; }
.q-content { font-size: 28rpx; display: block; margin-bottom: 12rpx; line-height: 1.4; }
.q-meta { display: flex; gap: 8rpx; flex-wrap: wrap; }
.q-tag { font-size: 20rpx; background: #f0f0f0; color: #666; padding: 2rpx 12rpx; border-radius: 4rpx; }
.btn-del { margin-top: 12rpx; font-size: 22rpx; background: #fff; color: #ff4d4f; border: 1px solid #ff4d4f; border-radius: 6rpx; padding: 4rpx 16rpx; }
.empty { text-align: center; padding: 80rpx 0; color: #ccc; font-size: 28rpx; }
</style>
