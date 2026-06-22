<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getMyExerciseUploads } from '@/api/modules/exercise'
import { listContributions } from '@/api/modules/contribution'
import type { ContributionItem, ExerciseUploadItem } from '@/types'

const router = useRouter()
const activeTab = ref<'question' | 'exercise'>('question')

const qList = ref<ContributionItem[]>([])
const qLoading = ref(true)
const qStLabels: Record<string, string> = {
  pending_review: '待审核',
  approved: '已入库',
  rejected: '已驳回',
}

onMounted(async () => {
  try {
    qList.value = await listContributions()
  }
  catch {
    qList.value = []
  }
  finally {
    qLoading.value = false
  }
})

const eList = ref<ExerciseUploadItem[]>([])
const eLoading = ref(true)

async function fetchExercises() {
  eLoading.value = true

  try {
    const data = await getMyExerciseUploads({})
    eList.value = data?.list ?? []
  }
  catch {
    eList.value = []
  }
  finally {
    eLoading.value = false
  }
}

function switchTab(tab: string) {
  activeTab.value = tab as 'question' | 'exercise'
  if (tab === 'exercise') {
    fetchExercises()
  }
}

const exTypeLabels: Record<string, string> = {
  sync: '同步练',
  unit: '单元练',
  topic: '专题练',
  exam: '期中期末',
}
const exStLabels: Record<string, string> = {
  pending_review: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
}
</script>

<template>
  <div class="contribute-page">
    <div class="page-header flex-between">
      <h1 class="page-header__title">我的贡献</h1>
      <el-button v-if="activeTab === 'question'" type="primary" @click="router.push('/contribute/upload')">上传题目</el-button>
      <el-button v-else type="primary" @click="router.push('/contribute/exercise-upload')">上传练习试卷</el-button>
    </div>

    <el-tabs v-model="activeTab" @tab-change="switchTab">
      <el-tab-pane label="题库贡献" name="question" />
      <el-tab-pane label="练习试卷贡献" name="exercise" />
    </el-tabs>

    <div v-if="activeTab === 'question'">
      <el-empty v-if="!qLoading && qList.length === 0" description="还没有题库贡献，上传试题获取返现">
        <el-button type="primary" @click="router.push('/contribute/upload')">上传题目</el-button>
      </el-empty>
      <el-table
        v-else
        v-loading="qLoading"
        :data="qList"
        class="page-card"
        stripe
        @row-click="(row: ContributionItem) => router.push(`/contribute/${row.id}`)"
      >
        <el-table-column label="文件名" show-overflow-tooltip>
          <template #default="{ row }">{{ row.filename ?? row.originalName ?? '未知文件' }}</template>
        </el-table-column>
        <el-table-column prop="subject" label="学科" width="80" />
        <el-table-column prop="grade" label="年级" width="80" />
        <el-table-column prop="createdAt" label="提交时间" width="170" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'" size="small">
              {{ qStLabels[row.status] ?? row.status }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="activeTab === 'exercise'">
      <el-empty v-if="!eLoading && eList.length === 0" description="还没有练习试卷贡献，上传练习试卷获取返现">
        <el-button type="primary" @click="router.push('/contribute/exercise-upload')">上传练习试卷</el-button>
      </el-empty>
      <el-table
        v-else
        v-loading="eLoading"
        :data="eList"
        class="page-card"
        stripe
        @row-click="(row: ExerciseUploadItem) => router.push(`/contribute/exercise/${row.id}`)"
      >
        <el-table-column prop="title" label="试卷标题" show-overflow-tooltip />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">{{ exTypeLabels[row.exerciseType] ?? row.exerciseType }}</template>
        </el-table-column>
        <el-table-column prop="subject" label="学科" width="70" />
        <el-table-column prop="grade" label="年级" width="70" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'" size="small">
              {{ exStLabels[row.status] ?? row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="返现" width="80">
          <template #default="{ row }">
            <span v-if="row.status === 'approved'" class="cashback-amount">¥{{ (row.cashbackAmount / 100).toFixed(2) }}</span>
            <span v-else class="text-secondary">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="160" />
      </el-table>
    </div>
  </div>
</template>

<style scoped lang="scss">
.contribute-page {
  max-width: 1500px;
}

.el-table {
  cursor: pointer;
}

.cashback-amount {
  font-weight: 500;
  color: #e67e22;
}
</style>
