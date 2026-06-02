<script setup lang="ts">
import { ref } from 'vue';
import { usePaperStore } from '../../../stores/paper';

const paper = usePaperStore();

const stages = ['小学', '初中', '高中'];
const gradeMap: Record<string, string[]> = {
  '小学': ['一年级','二年级','三年级','四年级','五年级','六年级'],
  '初中': ['七年级','八年级','九年级'],
  '高中': ['高一','高二','高三'],
};
const subjects = ['语文','数学','英语','物理','化学','生物','政治','历史','地理'];

const selectedStage = ref('');

function selectStage(stage: string) {
  selectedStage.value = stage;
}

function selectGrade(grade: string) {
  paper.condition.grade = grade;
}

function selectSubject(subject: string) {
  paper.condition.subject = subject;
  paper.fetchKnowledgePoints();
}

async function handleGenerate() {
  if (!paper.condition.subject) {
    uni.showToast({ title: '请选择科目', icon: 'none' });
    return;
  }
  if (!paper.condition.grade) {
    uni.showToast({ title: '请选择年级', icon: 'none' });
    return;
  }
  await paper.generate();
  if (paper.currentPaper) {
    uni.navigateTo({ url: '/pages/paper/preview/index' });
  }
}
</script>

<template>
  <view class="config">
    <view class="section"><text class="label">学段</text>
      <view class="tags">
        <view v-for="s in stages" :key="s" class="tag" :class="{ active: selectedStage === s }" @tap="selectStage(s)">{{ s }}</view>
      </view>
    </view>

    <view v-if="selectedStage" class="section"><text class="label">年级</text>
      <view class="tags">
        <view v-for="g in gradeMap[selectedStage]" :key="g" class="tag" :class="{ active: paper.condition.grade === g }" @tap="selectGrade(g)">{{ g }}</view>
      </view>
    </view>

    <view class="section"><text class="label">科目</text>
      <view class="tags">
        <view v-for="s in subjects" :key="s" class="tag" :class="{ active: paper.condition.subject === s }" @tap="selectSubject(s)">{{ s }}</view>
      </view>
    </view>

    <view class="section"><text class="label">难度</text>
      <view class="tags">
        <view v-for="d in [{v:1,l:'简单'},{v:2,l:'中等'},{v:3,l:'困难'},{v:'mixed',l:'混合'}]" :key="d.v"
              class="tag" :class="{ active: paper.condition.difficulty === String(d.v) }"
              @tap="paper.condition.difficulty = String(d.v)">{{ d.l }}</view>
      </view>
    </view>

    <view class="section"><text class="label">题量: {{ paper.condition.questionCount }}</text>
      <slider :min="1" :max="50" :value="paper.condition.questionCount" @change="(e: any) => paper.condition.questionCount = e.detail.value" />
    </view>

    <button class="btn-generate" :loading="paper.loading" @tap="handleGenerate">生成试卷</button>
  </view>
</template>

<style scoped>
.config { padding: 30rpx; }
.section { margin-bottom: 36rpx; }
.label { font-size: 28rpx; color: #333; margin-bottom: 16rpx; display: block; }
.tags { display: flex; flex-wrap: wrap; gap: 16rpx; }
.tag { padding: 12rpx 24rpx; background: #f0f0f0; border-radius: 8rpx; font-size: 26rpx; }
.tag.active { background: #1677ff; color: #fff; }
.btn-generate { margin-top: 60rpx; background: #1677ff; color: #fff; border-radius: 12rpx; height: 88rpx; line-height: 88rpx; }
</style>
