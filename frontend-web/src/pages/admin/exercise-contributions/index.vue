<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminListExerciseUploads, adminApproveExerciseUpload, adminRejectExerciseUpload, adminBatchExerciseUploads } from '@/api/modules/exercise'
import type { ExerciseUploadItem } from '@/types'

const list = ref<ExerciseUploadItem[]>([]); const loading = ref(true)
const selected = ref<string[]>([])
const filters = ref({ status: '', subject: '', grade: '', exerciseType: '' })
const pagination = ref({ page: 1, pageSize: 20, total: 0, totalPages: 0 })

const subjects = ['语文','数学','英语','物理','化学','生物','政治','历史','地理','科学']
const grades = ['一年级','二年级','三年级','四年级','五年级','六年级','七年级','八年级','九年级','高一','高二','高三']
const exTypes = [
  { v: '', l: '全部' }, { v: 'sync', l: '同步练' }, { v: 'unit', l: '单元练' }, { v: 'topic', l: '专题练' }, { v: 'exam', l: '期中期末' },
]
const stLabels: Record<string, string> = { pending_review: '待审核', approved: '已通过', rejected: '已拒绝' }
const exTypeLabels: Record<string, string> = { sync: '同步练', unit: '单元练', topic: '专题练', exam: '期中期末' }

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  const p: any = { ...filters.value, page: pagination.value.page, pageSize: pagination.value.pageSize }
  Object.keys(p).forEach(k => { if (!p[k]) delete p[k] })
  try {
    const d = await adminListExerciseUploads(p) as any
    list.value = d?.list ?? []
    if (d?.pagination) pagination.value = d.pagination
  } catch {} finally { loading.value = false; selected.value = [] }
}

function reset() {
  filters.value = { status: '', subject: '', grade: '', exerciseType: '' }
  pagination.value.page = 1
  fetchList()
}

function toggleAll() {
  if (selected.value.length === list.value.length) selected.value = []
  else selected.value = list.value.map((i: any) => i.id)
}

async function approveOne(id: string) {
  try { await adminApproveExerciseUpload(id); ElMessage.success('已通过'); fetchList() } catch {}
}
async function rejectOne(id: string) {
  try {
    const { value: note } = await ElMessageBox.prompt('拒绝原因（选填）', '拒绝', { confirmButtonText: '拒绝', cancelButtonText: '取消' })
    await adminRejectExerciseUpload(id, note || undefined)
    ElMessage.success('已拒绝'); fetchList()
  } catch { /* cancel */ }
}

function downloadFile(url: string) {
  if (!url) { ElMessage.warning('文件地址不存在'); return }
  // 直接用 a 标签下载，避免 popup 拦截
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.click()
}

async function batchAction(action: 'approve' | 'reject') {
  if (!selected.value.length) { ElMessage.warning('请先选择'); return }
  const label = action === 'approve' ? '通过' : '拒绝'
  try {
    await ElMessageBox.confirm(`确认${label}选中的 ${selected.value.length} 条记录？`, '批量操作', { type: 'warning' })
    let note: string | undefined
    if (action === 'reject') {
      const { value } = await ElMessageBox.prompt('拒绝原因（选填）', '批量拒绝') as any
      note = value || undefined
    }
    await adminBatchExerciseUploads({ ids: selected.value, action, note })
    ElMessage.success('操作成功'); fetchList()
  } catch { /* cancel */ }
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
      <span class="text-secondary" style="margin-left:auto">共 {{ pagination.total }} 条</span>
    </div>

    <el-table :data="list" @selection-change="(v:any)=>selected=v.map((i:any)=>i.id)" class="page-card" v-loading="loading" stripe>
      <el-table-column type="selection" width="40" />
      <el-table-column prop="title" label="试卷标题" show-overflow-tooltip />
      <el-table-column label="类型" width="90">
        <template #default="{row}">{{ exTypeLabels[row.exerciseType] ?? row.exerciseType }}</template>
      </el-table-column>
      <el-table-column prop="subject" label="学科" width="70" />
      <el-table-column prop="grade" label="年级" width="70" />
      <el-table-column label="上传者" width="130">
        <template #default="{row}">{{ row.uploaderPhone ?? '—' }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="提交时间" width="160" />
      <el-table-column label="状态" width="90">
        <template #default="{row}">
          <el-tag :type="row.status==='approved'?'success':row.status==='rejected'?'danger':'warning'" size="small">{{ stLabels[row.status] ?? row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{row}">
          <el-button size="small" @click.stop="downloadFile(row.fileUrl)">📥 下载</el-button>
          <template v-if="row.status==='pending_review'">
            <el-button size="small" type="success" @click.stop="approveOne(row.id)">通过</el-button>
            <el-button size="small" type="danger" @click.stop="rejectOne(row.id)">拒绝</el-button>
          </template>
          <span v-else class="text-secondary">—</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-if="pagination.totalPages>1" class="mt-md" :current-page="pagination.page" :total="pagination.total" :page-size="pagination.pageSize"
      @current-change="(p:number)=>{pagination.page=p;fetchList()}" layout="total, prev, pager, next" background />
  </div>
</template>
