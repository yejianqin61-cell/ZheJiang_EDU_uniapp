<script setup lang="ts">
import { ref } from 'vue';
import { uploadContribution, getFileStatus } from '../../../api';

const subject = ref('数学');
const grade = ref('五年级');
const filePath = ref('');
const fileName = ref('');
const uploading = ref(false);
const fileId = ref('');
const processing = ref(false);

function chooseFile() {
  // #ifdef MP-WEIXIN
  uni.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['doc', 'docx', 'md', 'pdf', 'png', 'jpg', 'jpeg'],
    success: (res) => {
      filePath.value = res.tempFiles[0].path;
      fileName.value = res.tempFiles[0].name ?? '';
    },
  });
  // #endif
  // #ifndef MP-WEIXIN
  uni.chooseFile({
    count: 1,
    success: (res) => {
      filePath.value = res.tempFiles[0].path;
      fileName.value = res.tempFiles[0].name ?? '';
    },
  });
  // #endif
}

async function handleUpload() {
  if (!filePath.value) { uni.showToast({ title: '请先选择文件', icon: 'none' }); return; }
  uploading.value = true;
  try {
    const res = await uploadContribution(filePath.value, subject.value, grade.value) as any;
    if (res.code === 0) {
      fileId.value = res.data.fileId;
      processing.value = true;
      uni.showToast({ title: '上传成功，正在解析...', icon: 'success' });
      // Poll for completion, then navigate to preview
      pollProcessing();
    }
  } catch { uni.showToast({ title: '上传失败', icon: 'none' }); }
  uploading.value = false;
}

async function pollProcessing() {
  const check = async () => {
    try {
      const res = await getFileStatus(fileId.value) as any;
      if (res.data.status === 'completed') {
        processing.value = false;
        uni.navigateTo({ url: `/pages/contribute/preview/index?fileId=${fileId.value}&filename=${encodeURIComponent(fileName.value)}` });
        return;
      }
      if (res.data.status === 'failed') { processing.value = false; uni.showToast({ title: '解析失败: ' + (res.data.errorMsg ?? ''), icon: 'none' }); return; }
      setTimeout(check, 1500);
    } catch { setTimeout(check, 2000); }
  };
  setTimeout(check, 2000);
}

const grades = ['一年级','二年级','三年级','四年级','五年级','六年级','七年级','八年级','九年级','高一','高二','高三'];
const subjects = ['语文','数学','英语','物理','化学','生物','政治','历史','地理'];
</script>

<template>
  <view class="upload-page">
    <view class="form-item">
      <text class="label">学科</text>
      <picker :value="subjects.indexOf(subject)" :range="subjects" @change="(e: any) => subject = subjects[e.detail.value]">
        <text class="value">{{ subject }}</text>
      </picker>
    </view>
    <view class="form-item">
      <text class="label">年级</text>
      <picker :value="grades.indexOf(grade)" :range="grades" @change="(e: any) => grade = grades[e.detail.value]">
        <text class="value">{{ grade }}</text>
      </picker>
    </view>

    <view class="file-picker" @tap="chooseFile">
      <text v-if="!fileName" class="picker-hint">点击选择文件 (DOC/DOCX/MD/PDF/图片)</text>
      <text v-else class="picker-name">已选: {{ fileName }}</text>
    </view>

    <button class="btn-upload" :loading="uploading || processing" @tap="handleUpload">
      {{ processing ? '解析中...' : '开始上传并解析' }}
    </button>

    <view v-if="processing" class="progress-tip">AI 正在解析题目，请稍候...</view>
    <view class="tip">上传后 AI 会自动解析题目。解析完成后可预览并提交审核。审核通过每题返现。</view>
  </view>
</template>

<style scoped>
.upload-page { padding: 30rpx; min-height: 100vh; background: #f5f5f5; }
.form-item { background: #fff; border-radius: 12rpx; padding: 24rpx 28rpx; margin-bottom: 16rpx; display: flex; justify-content: space-between; align-items: center; }
.label { font-size: 28rpx; color: #333; }
.value { font-size: 28rpx; color: #1677ff; }
.file-picker { background: #fff; border-radius: 12rpx; padding: 60rpx 28rpx; margin-bottom: 16rpx; text-align: center; border: 2rpx dashed #d9d9d9; }
.picker-hint { font-size: 28rpx; color: #999; }
.picker-name { font-size: 28rpx; color: #1677ff; }
.btn-upload { width: 100%; height: 96rpx; line-height: 96rpx; background: #52c41a; color: #fff; border-radius: 12rpx; font-size: 32rpx; border: none; margin-top: 20rpx; }
.progress-tip { text-align: center; padding: 40rpx; font-size: 28rpx; color: #1677ff; }
.tip { margin-top: 40rpx; font-size: 24rpx; color: #bbb; text-align: center; line-height: 1.6; }
</style>
