<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getContribution } from '@/api/modules/contribution'
import type { ContributionItem } from '@/types'

const route = useRoute()
const item = ref<ContributionItem | null>(null)
const loading = ref(true)
const stLabels: Record<string, string> = {
  pending_review: '待审核',
  approved: '已入库',
  rejected: '已驳回',
}

onMounted(async () => {
  try {
    item.value = await getContribution(String(route.params.id))
  }
  catch {
    item.value = null
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="detail-page">
    <div class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="breadcrumb__separator">›</span>
      <router-link to="/contribute">我的贡献</router-link>
      <span class="breadcrumb__separator">›</span>
      <span class="breadcrumb__current">贡献详情</span>
    </div>
    <div v-if="loading" class="loading-wrap">
      <p class="text-secondary">加载中...</p>
    </div>
    <div v-else-if="item" class="page-card">
      <h2>{{ item.filename ?? item.originalName ?? '未知文件' }}</h2>
      <div class="info-grid mt-md">
        <div class="info-row"><span>学科</span><span>{{ item.subject }}</span></div>
        <div class="info-row"><span>年级</span><span>{{ item.grade }}</span></div>
        <div class="info-row">
          <span>状态</span>
          <el-tag :type="item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'danger' : 'warning'" size="small">
            {{ stLabels[item.status] ?? item.status }}
          </el-tag>
        </div>
        <div class="info-row"><span>题目数</span><span>{{ item.questionCount ?? '—' }}</span></div>
        <div v-if="item.reward" class="info-row"><span>返现金额</span><span class="amount">¥{{ (item.reward / 100).toFixed(2) }}</span></div>
        <div class="info-row"><span>上传时间</span><span>{{ item.createdAt }}</span></div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.detail-page {
  max-width: 1500px;
}

.loading-wrap {
  padding: 80px 0;
  text-align: center;
}

.info-grid {
  .info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    font-size: $font-size-sm;
    border-bottom: 1px solid #f5f5f5;

    span:first-child {
      color: $text-color-secondary;
    }

    &:last-child {
      border-bottom: none;
    }
  }

  .amount {
    font-weight: 600;
    color: $color-danger;
  }
}
</style>
