<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { KnowledgePoint, Pagination } from '@/types'
import { getKnowledgePoints } from '@/api/modules/admin'

interface KnowledgeFilters {
  subject: string
  grade: string
}

const list = ref<KnowledgePoint[]>([])
const loading = ref(true)
const filters = ref<KnowledgeFilters>({ subject: '', grade: '' })
const subjects = ['', '语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '科学']
const grades = ['', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '七年级', '八年级', '九年级', '高一', '高二', '高三']
const pagination = ref<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 })

onMounted(() => {
  void fetchList()
})

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function buildParams() {
  const params: Record<string, string | number> = {
    page: pagination.value.page,
    pageSize: pagination.value.pageSize,
  }

  if (filters.value.subject) {
    params.subject = filters.value.subject
  }

  if (filters.value.grade) {
    params.grade = filters.value.grade
  }

  return params
}

async function fetchList() {
  loading.value = true

  try {
    const response = await getKnowledgePoints(buildParams())
    list.value = response?.list ?? []

    if (response?.pagination) {
      pagination.value = response.pagination
    }
  }
  catch (error: unknown) {
    list.value = []
    ElMessage.error(getErrorMessage(error, '知识点加载失败'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-header__title">知识点中心</h1>
    </div>
    <div class="filter-bar">
      <el-select v-model="filters.subject" placeholder="学科" clearable @change="fetchList">
        <el-option v-for="subject in subjects" :key="subject" :label="subject || '全部'" :value="subject" />
      </el-select>
      <el-select v-model="filters.grade" placeholder="年级" clearable @change="fetchList">
        <el-option v-for="grade in grades" :key="grade" :label="grade || '全部'" :value="grade" />
      </el-select>
      <el-button type="primary" @click="fetchList">筛选</el-button>
      <span class="text-secondary" style="margin-left: auto">共 {{ pagination.total }} 个知识点</span>
    </div>
    <el-table v-loading="loading" :data="list" class="page-card" stripe>
      <el-table-column prop="name" label="知识点名称" />
      <el-table-column prop="subject" label="学科" width="80" />
      <el-table-column prop="grade" label="年级" width="80" />
      <el-table-column prop="questionCount" label="关联题目数" width="100" />
    </el-table>
    <el-pagination
      v-if="pagination.totalPages > 1"
      :current-page="pagination.page"
      :total="pagination.total"
      :page-size="pagination.pageSize"
      class="mt-md"
      layout="total, prev, pager, next"
      background
      @current-change="(page: number) => { pagination.page = page; void fetchList() }"
    />
  </div>
</template>
