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
const generating = ref(false);
const genProgress = ref(0);
let progressTimer: ReturnType<typeof setInterval> | null = null;

function selectStage(stage: string) {
  selectedStage.value = stage;
}

function selectGrade(grade: string) {
  paper.condition.grade = grade;
}

function selectSubject(subject: string) {
  paper.condition.subject = subject;
  paper.condition.knowledgePointIds = [];
  paper.fetchKnowledgePoints();
}

function toggleKp(kpId: string) {
  const ids = paper.condition.knowledgePointIds ?? [];
  const idx = ids.indexOf(kpId);
  if (idx >= 0) { ids.splice(idx, 1); }
  else { ids.push(kpId); }
}

function isKpSelected(kpId: string): boolean {
  return (paper.condition.knowledgePointIds ?? []).includes(kpId);
}

async function handleGenerate() {
  if (!paper.condition.subject) { uni.showToast({ title: '请选择科目', icon: 'none' }); return; }
  if (!paper.condition.grade) { uni.showToast({ title: '请选择年级', icon: 'none' }); return; }

  // Start progress bar (frontend-only, 30s)
  generating.value = true;
  genProgress.value = 0;
  const startTime = Date.now();
  const duration = 30000; // 30 seconds

  progressTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    genProgress.value = Math.min(95, Math.round((elapsed / duration) * 100));
  }, 200);

  try {
    await paper.generate();
    // Jump to 100% on success
    genProgress.value = 100;
    await new Promise(r => setTimeout(r, 300));
  } catch {
    // stay on page, close overlay
  } finally {
    if (progressTimer) clearInterval(progressTimer);
    generating.value = false;
  }

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

    <view v-if="paper.knowledgePoints.length > 0" class="section">
      <text class="label">知识点（可选，不选则不限）</text>
      <view class="tags">
        <view v-for="kp in paper.knowledgePoints" :key="kp.id"
              class="tag" :class="{ active: isKpSelected(kp.id) }"
              @tap="toggleKp(kp.id)">{{ kp.name }} ({{ kp.questionCount }})</view>
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

    <!-- Generating overlay -->
    <view v-if="generating" class="overlay">
      <view class="overlay-card">
        <text class="overlay-title">AI 正在生成试卷...</text>
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: genProgress + '%' }"></view>
        </view>
        <text class="progress-text">{{ genProgress }}%</text>
        <text class="overlay-hint">预计还需 {{ Math.ceil((100 - genProgress) / 100 * 30) }} 秒</text>
      </view>
    </view>
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

/* Overlay */
.overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 999; }
.overlay-card { background: #fff; border-radius: 20rpx; padding: 60rpx 50rpx; width: 560rpx; text-align: center; }
.overlay-title { font-size: 32rpx; font-weight: 600; display: block; margin-bottom: 40rpx; }
.progress-bar { height: 16rpx; background: #e8e8e8; border-radius: 8rpx; overflow: hidden; margin-bottom: 16rpx; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #1677ff, #4096ff); border-radius: 8rpx; transition: width 0.3s; }
.progress-text { font-size: 40rpx; font-weight: 700; color: #1677ff; display: block; margin-bottom: 8rpx; }
.overlay-hint { font-size: 24rpx; color: #999; display: block; }
</style>
