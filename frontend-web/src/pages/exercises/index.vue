<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

type ExerciseTab = 'sync' | 'unit' | 'topic' | 'exam'

interface ExerciseTabOption {
  key: ExerciseTab
  label: string
  desc: string
}

const router = useRouter()
const tab = ref<ExerciseTab>('sync')
const grade = ref('')
const subject = ref('')
const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '七年级', '八年级', '九年级', '高一', '高二', '高三']
const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '科学']
const tabs: ExerciseTabOption[] = [
  { key: 'sync', label: '同步练', desc: '跟着课本走，一课一练' },
  { key: 'unit', label: '单元练', desc: '学完一个单元，巩固检测' },
  { key: 'topic', label: '专题练', desc: '知识模块专项突破' },
  { key: 'exam', label: '期中期末', desc: '考前模拟冲刺' },
]

function selectTab(nextTab: ExerciseTab) {
  tab.value = nextTab
}

function goNext() {
  if (!grade.value || !subject.value) {
    return
  }

  router.push(`/exercises/category?type=${tab.value}&grade=${grade.value}&subject=${subject.value}`)
}
</script>

<template>
  <div class="exercises-page">
    <div class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="breadcrumb__separator">›</span>
      <span class="breadcrumb__current">练习</span>
    </div>

    <div class="tab-row">
      <div
        v-for="tabOption in tabs"
        :key="tabOption.key"
        class="tab-card"
        :class="{ active: tab === tabOption.key }"
        @click="selectTab(tabOption.key)"
      >
        <h3>{{ tabOption.label }}</h3>
        <p>{{ tabOption.desc }}</p>
      </div>
    </div>

    <div class="page-card mt-md">
      <h3>选择年级和科目</h3>
      <el-row :gutter="16" class="mt-md">
        <el-col :span="12">
          <el-select v-model="grade" placeholder="选择年级" size="large" style="width:100%">
            <el-option v-for="gradeOption in grades" :key="gradeOption" :label="gradeOption" :value="gradeOption" />
          </el-select>
        </el-col>
        <el-col :span="12">
          <el-select v-model="subject" placeholder="选择科目" size="large" style="width:100%">
            <el-option v-for="subjectOption in subjects" :key="subjectOption" :label="subjectOption" :value="subjectOption" />
          </el-select>
        </el-col>
      </el-row>
      <el-button type="primary" size="large" :disabled="!grade || !subject" class="mt-md" style="min-width:200px" @click="goNext">
        下一步
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.exercises-page {
  max-width: 1500px;
}

.tab-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-md;
}

.tab-card {
  padding: $spacing-lg;
  text-align: center;
  border-radius: $border-radius;
  cursor: pointer;
  border: 2px solid $border-color;
  transition: all 0.2s;

  h3 {
    font-size: $font-size-lg;
    margin-bottom: 4px;
  }

  p {
    font-size: $font-size-xs;
    color: $text-color-secondary;
  }

  &:hover {
    border-color: $color-primary-light;
  }

  &.active {
    border-color: $color-primary;
    background: #fef9f0;
  }
}
</style>
