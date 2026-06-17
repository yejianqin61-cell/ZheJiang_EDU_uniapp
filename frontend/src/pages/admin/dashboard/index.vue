<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getDashboardStats } from '../../../api';
import type { DashboardStats } from '../../../types';

// #ifdef H5
import * as echarts from 'echarts';
// #endif

const stats = ref<DashboardStats | null>(null);

onMounted(async () => {
  const res = await getDashboardStats();
  stats.value = res.data;
  // #ifdef H5
  setTimeout(() => renderCharts(res.data), 100);
  // #endif
});

function renderCharts(data: DashboardStats) {
  // Subject Pie
  const pieDom = document.getElementById('chart-subject-pie');
  if (pieDom) {
    const pie = echarts.init(pieDom);
    pie.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie', radius: ['45%', '70%'],
        data: data.bySubject.map((s) => ({ name: s.subject, value: s.count })),
        label: { formatter: '{b}\n{d}%' },
      }],
    });
  }

  // Grade Bar
  const barDom = document.getElementById('chart-grade-bar');
  if (barDom) {
    const bar = echarts.init(barDom);
    bar.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: data.byGrade.map((g) => g.grade) },
      yAxis: { type: 'value' },
      series: [{
        type: 'bar', data: data.byGrade.map((g) => g.count),
        itemStyle: { color: '#1677ff', borderRadius: [4, 4, 0, 0] },
      }],
    });
  }

  // Difficulty Pie
  const diffDom = document.getElementById('chart-difficulty-pie');
  if (diffDom) {
    const diff = echarts.init(diffDom);
    diff.setOption({
      tooltip: { trigger: 'item' },
      color: ['#52c41a', '#faad14', '#ff4d4f'],
      series: [{
        type: 'pie', radius: ['45%', '70%'],
        data: data.byDifficulty.map((d) => ({ name: d.label, value: d.count })),
        label: { formatter: '{b}\n{d}%' },
      }],
    });
  }
}
</script>

<template>
  <view class="dashboard" v-if="stats">
    <view class="stat-row">
      <view class="stat-card"><text class="stat-num">{{ stats.totalQuestions }}</text><text class="stat-label">总题量</text></view>
      <view class="stat-card"><text class="stat-num">{{ stats.totalKnowledgePoints }}</text><text class="stat-label">知识点总数</text></view>
    </view>

    <!-- H5 ECharts -->
    <!-- #ifdef H5 -->
    <view class="section">
      <text class="section-title">学科分布</text>
      <view id="chart-subject-pie" style="width:100%;height:400rpx"></view>
    </view>

    <view class="section">
      <text class="section-title">年级分布</text>
      <view id="chart-grade-bar" style="width:100%;height:400rpx"></view>
    </view>

    <view class="section">
      <text class="section-title">难度分布</text>
      <view id="chart-difficulty-pie" style="width:100%;height:400rpx"></view>
    </view>
    <!-- #endif -->

    <!-- WeChat fallback: simple bars -->
    <!-- #ifndef H5 -->
    <view class="section"><text class="section-title">学科分布</text>
      <view v-for="s in stats.bySubject" :key="s.subject" class="bar-row">
        <text class="bar-label">{{ s.subject }}</text>
        <view class="bar"><view class="bar-fill" :style="{ width: (s.count / stats.totalQuestions * 100) + '%' }"></view></view>
        <text class="bar-value">{{ s.count }}</text>
      </view>
    </view>

    <view class="section"><text class="section-title">难度分布</text>
      <view v-for="d in stats.byDifficulty" :key="d.level" class="bar-row">
        <text class="bar-label">{{ d.label }}</text>
        <view class="bar"><view class="bar-fill" :style="{ width: (d.count / stats.totalQuestions * 100) + '%' }"></view></view>
        <text class="bar-value">{{ d.count }}</text>
      </view>
    </view>
    <!-- #endif -->

    <view class="section"><text class="section-title">快捷入口</text>
      <view class="nav-grid">
        <view class="nav-item" @tap="uni.navigateTo({ url: '/pages/admin/upload/index' })"><text>📤 上传资料</text></view>
        <view class="nav-item" @tap="uni.navigateTo({ url: '/pages/admin/review/index' })"><text>✅ 入库审核</text></view>
        <view class="nav-item" @tap="uni.navigateTo({ url: '/pages/admin/questions/index' })"><text>📋 题库管理</text></view>
        <view class="nav-item" @tap="uni.navigateTo({ url: '/pages/admin/knowledge/index' })"><text>📚 知识点</text></view>
        <view class="nav-item" @tap="uni.navigateTo({ url: '/pages/admin/orders/index' })"><text>📦 订单管理</text></view>
        <view class="nav-item" @tap="uni.navigateTo({ url: '/pages/admin/pricing/index' })"><text>💰 定价配置</text></view>
        <view class="nav-item" @tap="uni.navigateTo({ url: '/pages/admin/withdrawals/index' })"><text>💳 提现管理</text></view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.dashboard { padding: 20rpx 30rpx; padding-bottom: 60rpx; }
.stat-row { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.stat-card { background: #fff; border-radius: 12rpx; padding: 30rpx; text-align: center; flex: 1; }
.stat-num { font-size: 48rpx; font-weight: bold; color: #1677ff; display: block; }
.stat-label { font-size: 24rpx; color: #999; }
.section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 500; margin-bottom: 16rpx; display: block; }
.bar-row { display: flex; align-items: center; margin-bottom: 12rpx; }
.bar-label { width: 80rpx; font-size: 24rpx; color: #666; }
.bar { flex: 1; height: 16rpx; background: #f0f0f0; border-radius: 8rpx; margin: 0 16rpx; overflow: hidden; }
.bar-fill { height: 100%; background: #1677ff; border-radius: 8rpx; transition: width 0.3s; }
.bar-value { font-size: 24rpx; color: #999; width: 60rpx; text-align: right; }
.nav-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.nav-item { width: calc(33.33% - 12rpx); background: #f5f5f5; border-radius: 12rpx; padding: 30rpx 0; text-align: center; font-size: 26rpx; }
</style>
