<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { use } from 'echarts/core'
import { PieChart, BarChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { init, type EChartsType } from 'echarts/core'
import { getDashboardStats } from '@/api/modules/admin'
import type { DashboardStats } from '@/types'

use([PieChart, BarChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer])

const stats = ref<DashboardStats>({
  totalQuestions: 0,
  bySubject: [],
  byGrade: [],
  byDifficulty: [],
  totalKnowledgePoints: 0,
  pendingReview: 0,
  todayOrders: 0,
  pendingPrint: 0,
  exercisePaperCount: 0,
  pendingExerciseReview: 0,
})
const loading = ref(true)
const subjectChart = ref<HTMLDivElement>()
const gradeChart = ref<HTMLDivElement>()
const difficultyChart = ref<HTMLDivElement>()

onMounted(async () => {
  try { stats.value = await getDashboardStats() } catch { /* ignore dashboard fallback */ }
  loading.value = false
  await nextTick()
  renderSubjectChart()
  renderGradeChart()
  renderDifficultyChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  subjectChartInst?.dispose()
  gradeChartInst?.dispose()
  difficultyChartInst?.dispose()
})

function renderSubjectChart() {
  if (!subjectChart.value) return
  subjectChartInst?.dispose()
  const chart = init(subjectChart.value)
  chart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'], avoidLabelOverlap: false,
      label: { show: true, formatter: '{b}\n{d}%' },
      data: (stats.value.bySubject || []).map((s: any) => ({ name: s.subject, value: s.count })),
    }],
  })
  subjectChartInst = chart
}

function renderGradeChart() {
  if (!gradeChart.value) return
  gradeChartInst?.dispose()
  const chart = init(gradeChart.value)
  const data = [...stats.value.byGrade].sort((a, b) => b.count - a.count)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: data.map((g) => g.grade), axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', name: '题量' },
    series: [{ type: 'bar', data: data.map((g) => g.count), itemStyle: { color: '#e67e22', borderRadius: [4, 4, 0, 0] } }],
    grid: { left: 50, right: 20, top: 20, bottom: 40 },
  })
  gradeChartInst = chart
}

function renderDifficultyChart() {
  if (!difficultyChart.value) return
  difficultyChartInst?.dispose()
  const chart = init(difficultyChart.value)
  const colors = ['#67c23a', '#e6a23c', '#f56c6c']
  chart.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: '65%', center: ['50%', '50%'],
      label: { formatter: '{b}: {c}题' },
      data: stats.value.byDifficulty.map((d, i) => ({ name: d.label, value: d.count, itemStyle: { color: colors[i] } })),
    }],
  })
  difficultyChartInst = chart
}

let subjectChartInst: EChartsType | undefined
let gradeChartInst: EChartsType | undefined
let difficultyChartInst: EChartsType | undefined
function handleResize() {
  subjectChartInst?.resize()
  gradeChartInst?.resize()
  difficultyChartInst?.resize()
}
</script>

<template>
  <div>
    <div class="page-header"><h1 class="page-header__title">仪表盘</h1></div>

    <div class="stat-cards">
      <div class="stat-card"><div class="stat-card__value">{{ stats.totalQuestions || '--' }}</div><div class="stat-card__label">总题量</div></div>
      <div class="stat-card"><div class="stat-card__value">{{ stats.bySubject?.length || '--' }}</div><div class="stat-card__label">学科数</div></div>
      <div class="stat-card"><div class="stat-card__value">{{ stats.totalKnowledgePoints || '--' }}</div><div class="stat-card__label">知识点数</div></div>
      <div class="stat-card"><div class="stat-card__value" style="color:#e6a23c">{{ stats.pendingReview || '--' }}</div><div class="stat-card__label">待审核</div></div>
      <div class="stat-card"><div class="stat-card__value" style="color:#67c23a">{{ stats.todayOrders || '--' }}</div><div class="stat-card__label">今日订单</div></div>
      <div class="stat-card"><div class="stat-card__value" style="color:#f56c6c">{{ stats.pendingPrint || '--' }}</div><div class="stat-card__label">待处理打印</div></div>
      <div class="stat-card"><div class="stat-card__value" style="color:#722ed1">{{ stats.exercisePaperCount ?? '--' }}</div><div class="stat-card__label">练习试卷数</div></div>
      <div class="stat-card"><div class="stat-card__value" style="color:#fa8c16">{{ stats.pendingExerciseReview ?? '--' }}</div><div class="stat-card__label">待审核练习</div></div>
    </div>

    <el-row :gutter="16" v-loading="loading">
      <el-col :span="12">
        <div class="page-card chart-card"><h3>学科分布</h3><div ref="subjectChart" style="height:320px"></div></div>
      </el-col>
      <el-col :span="12">
        <div class="page-card chart-card"><h3>难度分布</h3><div ref="difficultyChart" style="height:320px"></div></div>
      </el-col>
    </el-row>

    <div class="page-card chart-card mt-md">
      <h3>年级分布</h3>
      <div ref="gradeChart" style="height:300px"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.chart-card { h3 { margin-bottom: $spacing-md; } }
</style>
