<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Pagination, ReviewListItem } from '@/types'
import { approveQuestion, batchReview, getReviewList, rejectQuestion } from '@/api/modules/admin'

const router = useRouter()
const list = ref<ReviewListItem[]>([])
const loading = ref(true)
const selected = ref<string[]>([])
const pagination = ref<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 })

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message
  }

  return '操作失败'
}

function isDismissedMessageBoxAction(error: unknown) {
  return error === 'cancel' || error === 'close'
}

onMounted(() => {
  void fetchList()
})

async function fetchList() {
  loading.value = true
  try {
    const data = await getReviewList({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    })
    list.value = data.list
    pagination.value = data.pagination
  } finally {
    loading.value = false
    selected.value = []
  }
}

function toggleAll() {
  selected.value = selected.value.length === list.value.length ? [] : list.value.map((item) => item.id)
}

async function batchAction(action: 'approve' | 'reject') {
  if (!selected.value.length) {
    ElMessage.warning('请先选择题目')
    return
  }

  try {
    await ElMessageBox.confirm(`确认${action === 'approve' ? '通过' : '拒绝'}选中的 ${selected.value.length} 道题目？`, '批量操作', {
      type: 'warning',
    })
    await batchReview(selected.value, action)
    ElMessage.success('操作成功')
    await fetchList()
  }
  catch (error: unknown) {
    if (isDismissedMessageBoxAction(error)) {
      return
    }

    ElMessage.error(getErrorMessage(error))
  }
}

async function singleAction(id: string, action: 'approve' | 'reject') {
  try {
    if (action === 'approve') {
      await approveQuestion(id)
    } else {
      await rejectQuestion(id)
    }
    ElMessage.success('操作成功')
    await fetchList()
  } catch (error: unknown) {
    ElMessage.error(getErrorMessage(error))
  }
}
</script>

<template>
  <div>
    <div class="page-header"><h1 class="page-header__title">入库审核</h1></div>
    <div class="filter-bar">
      <el-button @click="toggleAll">{{ selected.length === list.length ? '取消全选' : '全选' }}</el-button>
      <el-button type="success" @click="batchAction('approve')">批量通过</el-button>
      <el-button type="danger" @click="batchAction('reject')">批量拒绝</el-button>
    </div>
    <el-table
      ref="table"
      v-loading="loading"
      :data="list"
      class="page-card"
      stripe
      @selection-change="(value: ReviewListItem[]) => selected = value.map((item) => item.id)"
    >
      <el-table-column type="selection" width="40" />
      <el-table-column prop="type" label="题型" width="80">
        <template #default="{ row }"><el-tag size="small">{{ row.type }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="content" label="题目内容" show-overflow-tooltip />
      <el-table-column prop="subject" label="学科" width="70" />
      <el-table-column prop="grade" label="年级" width="70" />
      <el-table-column prop="difficulty" label="难度" width="70" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button size="small" @click="router.push(`/admin/review/${row.id}`)">详情</el-button>
          <el-button size="small" type="success" @click="singleAction(row.id, 'approve')">通过</el-button>
          <el-button size="small" type="danger" @click="singleAction(row.id, 'reject')">拒绝</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-if="pagination.totalPages > 1"
      :current-page="pagination.page"
      :page-size="pagination.pageSize"
      :total="pagination.total"
      class="mt-md"
      layout="total, prev, pager, next"
      background
      @current-change="(page: number) => { pagination.page = page; void fetchList() }"
    />
  </div>
</template>
