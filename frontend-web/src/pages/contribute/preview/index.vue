<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { renderMarkdown } from '@/composables/useMarkdown'
import { getContributionQuestions, submitContribution } from '@/api/modules/contribution'
import type { ContributionQuestion } from '@/types'

const route = useRoute()
const router = useRouter()
const questions = ref<ContributionQuestion[]>([])
const loading = ref(true)
const submitting = ref(false)

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

onMounted(async () => {
  try {
    questions.value = await getContributionQuestions(String(route.query.id))
  }
  catch (error: unknown) {
    questions.value = []
    ElMessage.error(getErrorMessage(error, '题库预览加载失败'))
  }
  finally {
    loading.value = false
  }
})

async function submit() {
  submitting.value = true

  try {
    await submitContribution(String(route.query.id))
    ElMessage.success('已提交审核')
    router.replace('/contribute')
  }
  catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '提交失败'))
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="preview-page">
    <div class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="breadcrumb__separator">›</span>
      <router-link to="/contribute">我的贡献</router-link>
      <span class="breadcrumb__separator">›</span>
      <span class="breadcrumb__current">题目预览</span>
    </div>
    <div v-if="loading" class="loading-wrap">
      <p class="text-secondary">AI 解析中...</p>
    </div>
    <div v-else>
      <div v-for="(question, index) in questions" :key="index" class="page-card question-card">
        <div class="q-header">
          <span class="q-index">{{ index + 1 }}.</span>
          <el-tag size="small">{{ question.type }}</el-tag>
        </div>
        <p class="q-content" v-html="renderMarkdown(question.content)"></p>
        <div v-if="question.options?.length" class="q-options">
          <div v-for="(option, optionIndex) in question.options" :key="optionIndex" class="q-option">{{ option }}</div>
        </div>
      </div>
      <div class="actions">
        <el-button type="primary" size="large" :loading="submitting" class="submit-button" @click="submit">确认无误，提交审核</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.preview-page {
  max-width: 1500px;
}

.loading-wrap {
  padding: 80px 0;
  text-align: center;
}

.question-card {
  margin-bottom: $spacing-md;

  .q-header {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    margin-bottom: $spacing-md;
  }

  .q-index {
    font-size: $font-size-lg;
    font-weight: 700;
  }

  .q-content {
    font-size: $font-size-base;
    line-height: 1.8;
    white-space: pre-wrap;
  }

  .q-options {
    margin-top: $spacing-md;
  }

  .q-option {
    padding: 4px 0;
    color: $text-color-secondary;
  }
}

.actions {
  padding: $spacing-lg 0;
}

.submit-button {
  width: 100%;
}
</style>
