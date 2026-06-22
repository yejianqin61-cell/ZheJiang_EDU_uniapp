<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  adminApproveExerciseUpload,
  adminBatchExerciseUploads,
  adminListExerciseUploads,
  adminRejectExerciseUpload,
  type ExerciseUploadBatchPayload,
  type ExerciseUploadListParams,
} from '@/api/modules/exercise'
import type { ExerciseUploadItem, Pagination } from '@/types'

type ExerciseContributionFilters = Omit<ExerciseUploadListParams, 'page' | 'pageSize'>
type SelectionRow = Pick<ExerciseUploadItem, 'id'>

const list = ref<ExerciseUploadItem[]>([])
const loading = ref(true)
const selected = ref<string[]>([])
const filters = ref<ExerciseContributionFilters>({
  status: undefined,
  subject: undefined,
  grade: undefined,
  exerciseType: undefined,
})
const pagination = ref<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 })

const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '科学']
const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '七年级', '八年级', '九年级', '高一', '高二', '高三']
const exTypes = [
  { v: '', l: '全部' },
  { v: 'sync', l: '同步练' },
  { v: 'unit', l: '单元练' },
  { v: 'topic', l: '专题练' },
  { v: 'exam', l: '期中期末' },
]
const stLabels: Record<ExerciseUploadItem['status'], string> = {
  pending_review: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
}
const exTypeLabels: Record<ExerciseUploadItem['exerciseType'], string> = {
  sync: '同步练',
  unit: '单元练',
  topic: '专题练',
  exam: '期中期末',
}

onMounted(() => fetchList())

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function isCancelAction(error: unknown) {
  return error === 'cancel' || error === 'close'
}

async function fetchList() {
  loading.value = true
  const params: ExerciseUploadListParams = {
    ...filters.value,
    page: pagination.value.page,
    pageSize: pagination.value.pageSize,
  }

  Object.keys(params).forEach((key) => {
    const typedKey = key as keyof ExerciseUploadListParams
    if (!params[typedKey]) delete params[typedKey]
  })

  try {
    const data = await adminListExerciseUploads(params)
    list.value = data.list ?? []
    pagination.value = data.pagination ?? pagination.value
  }
  catch {
    list.value = []
  }
  finally {
    loading.value = false
    selected.value = []
  }
}

function reset() {
  filters.value = {
    status: undefined,
    subject: undefined,
    grade: undefined,
    exerciseType: undefined,
  }
  pagination.value.page = 1
  fetchList()
}

function toggleAll() {
  if (selected.value.length === list.value.length) selected.value = []
  else selected.value = list.value.map(item => item.id)
}

async function approveOne(id: string) {
  try {
    await adminApproveExerciseUpload(id)
    ElMessage.success('已通过')
    fetchList()
  }
  catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '审核通过失败'))
  }
}

async function rejectOne(id: string) {
  try {
    const { value: note } = await ElMessageBox.prompt('拒绝原因（选填）', '拒绝', {
      confirmButtonText: '拒绝',
      cancelButtonText: '取消',
    })
    await adminRejectExerciseUpload(id, note || undefined)
    ElMessage.success('已拒绝')
    fetchList()
  }
  catch (error: unknown) {
    if (isCancelAction(error)) {
      return
    }

    ElMessage.error(getErrorMessage(error, '审核拒绝失败'))
  }
}

function downloadFile(url: string) {
  if (!url) {
    ElMessage.warning('文件地址不存在')
    return
  }

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.target = '_blank'
  anchor.click()
}

function getExerciseTypeLabel(type: ExerciseUploadItem['exerciseType']) {
  return exTypeLabels[type] ?? type
}

function getStatusLabel(status: ExerciseUploadItem['status']) {
  return stLabels[status] ?? status
}

async function batchAction(action: 'approve' | 'reject') {
  if (!selected.value.length) {
    ElMessage.warning('请先选择')
    return
  }

  const label = action === 'approve' ? '通过' : '拒绝'

  try {
    await ElMessageBox.confirm(`确认${label}选中的 ${selected.value.length} 条记录？`, '批量操作', { type: 'warning' })
    let note: string | undefined

    if (action === 'reject') {
      const promptResult = await ElMessageBox.prompt('拒绝原因（选填）', '批量拒绝')
      note = promptResult.value || undefined
    }

    const payload: ExerciseUploadBatchPayload = { ids: selected.value, action, note }
    await adminBatchExerciseUploads(payload)
    ElMessage.success('操作成功')
    fetchList()
  }
  catch (error: unknown) {
    if (isCancelAction(error)) {
      return
    }

    ElMessage.error(getErrorMessage(error, '批量操作失败'))
  }
}
</script>

<template>
  <div>
    <div class="page-header"><h1 class="page-header__title">练习审核</h1></div>

    <div class="filter-bar">
      <el-select v-model="filters.status" placeholder="状态" clearable @change="fetchList" style="width:120px">
        <el-option label="全部" value="" />
        <el-option label="待审核" value="pending_review" />
        <el-option label="已通过" value="approved" />
        <el-option label="已拒绝" value="rejected" />
      </el-select>
      <el-select v-model="filters.subject" placeholder="学科" clearable @change="fetchList" style="width:100px">
        <el-option v-for="s in subjects" :key="s" :label="s" :value="s" />
      </el-select>
      <el-select v-model="filters.grade" placeholder="年级" clearable @change="fetchList" style="width:100px">
        <el-option v-for="g in grades" :key="g" :label="g" :value="g" />
      </el-select>
      <el-select v-model="filters.exerciseType" placeholder="类型" clearable @change="fetchList" style="width:110px">
        <el-option v-for="t in exTypes" :key="t.v" :label="t.l" :value="t.v" />
      </el-select>
      <el-button @click="toggleAll">{{ selected.length === list.length ? '取消全选' : '全选' }}</el-button>
      <el-button type="success" @click="batchAction('approve')">批量通过</el-button>
      <el-button type="danger" @click="batchAction('reject')">批量拒绝</el-button>
      <el-button @click="reset">重置</el-button>
      <span class="text-secondary" style="margin-left:auto">共 {{ pagination.total }} 条</span>
    </div>

    <el-table
      :data="list"
      @selection-change="(rows: SelectionRow[]) => selected = rows.map(row => row.id)"
      class="page-card"
      v-loading="loading"
      stripe
    >
      <el-table-column type="selection" width="40" />
      <el-table-column prop="title" label="试卷标题" show-overflow-tooltip />
      <el-table-column label="类型" width="90">
        <template #default="{ row }">{{ getExerciseTypeLabel(row.exerciseType) }}</template>
      </el-table-column>
      <el-table-column prop="subject" label="学科" width="70" />
      <el-table-column prop="grade" label="年级" width="70" />
      <el-table-column label="上传者" width="130">
        <template #default="{ row }">{{ row.uploaderPhone ?? '—' }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="提交时间" width="160" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'" size="small">
            {{ getStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click.stop="downloadFile(row.fileUrl)">下载</el-button>
          <template v-if="row.status === 'pending_review'">
            <el-button size="small" type="success" @click.stop="approveOne(row.id)">通过</el-button>
            <el-button size="small" type="danger" @click.stop="rejectOne(row.id)">拒绝</el-button>
          </template>
          <span v-else class="text-secondary">—</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="pagination.totalPages > 1"
      class="mt-md"
      :current-page="pagination.page"
      :total="pagination.total"
      :page-size="pagination.pageSize"
      @current-change="(page: number) => { pagination.page = page; fetchList() }"
      layout="total, prev, pager, next"
      background
    />
  </div>
</template>
