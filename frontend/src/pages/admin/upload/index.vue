<script setup lang="ts">
import { ref } from 'vue';
import { uploadFile } from '../../../api';

const subject = ref('');
const grade = ref('');
const subjects = ['语文','数学','英语','物理','化学','生物','政治','历史','地理'];
const grades = ['一年级','二年级','三年级','四年级','五年级','六年级','七年级','八年级','九年级','高一','高二','高三'];
const uploading = ref(false);

function chooseFile() {
  if (!subject.value || !grade.value) {
    uni.showToast({ title: '请先选择学科和年级', icon: 'none' });
    return;
  }
  // #ifdef H5
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.doc,.docx,.md,.pdf,.png,.jpg,.jpeg';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    uploading.value = true;
    uni.showToast({ title: '上传中...', icon: 'loading', duration: 99999 });
    try {
      const result: any = await uploadFile(file, subject.value, grade.value);
      uni.hideToast();
      uni.showToast({ title: '上传成功，AI解析中...', icon: 'success' });
      setTimeout(() => {
        uni.redirectTo({ url: `/pages/admin/review/index?fileId=${result.data?.fileId}` });
      }, 1000);
    } catch (e) {
      uni.showToast({ title: '上传失败', icon: 'none' });
    } finally {
      uploading.value = false;
    }
  };
  input.click();
  // #endif
  // #ifndef H5
  uni.chooseMessageFile({
    count: 1,
    type: 'file',
    success: async (res: any) => {
      uploading.value = true;
      uni.showToast({ title: '上传中...', icon: 'loading', duration: 99999 });
      try {
        const result: any = await uploadFile(res.tempFiles[0].path, subject.value, grade.value);
        uni.hideToast();
        uni.showToast({ title: '上传成功，AI解析中...', icon: 'success' });
        setTimeout(() => {
          uni.redirectTo({ url: `/pages/admin/review/index?fileId=${result.data?.fileId}` });
        }, 1000);
      } catch {
        uni.showToast({ title: '上传失败', icon: 'none' });
      } finally {
        uploading.value = false;
      }
    },
  });
  // #endif
}
</script>

<template>
  <view class="upload">
    <view class="section"><text class="label">学科</text>
      <view class="tags">
        <view v-for="s in subjects" :key="s" class="tag" :class="{ active: subject === s }" @tap="subject = s">{{ s }}</view>
      </view>
    </view>

    <view class="section"><text class="label">年级</text>
      <view class="tags">
        <view v-for="g in grades" :key="g" class="tag" :class="{ active: grade === g }" @tap="grade = g">{{ g }}</view>
      </view>
    </view>

    <view class="info"><text>支持格式: DOC, DOCX, MD, PDF, PNG, JPG, JPEG</text></view>
    <view class="info"><text>文本类 ≤ 50MB | 图片类 ≤ 10MB</text></view>

    <button class="btn-upload" :loading="uploading" @tap="chooseFile">选择文件上传</button>

    <view class="progress-link" @tap="uni.navigateTo({ url: '/pages/admin/upload/progress/index' })">
      查看上传记录 →
    </view>
  </view>
</template>

<style scoped>
.upload { padding: 30rpx; }
.section { margin-bottom: 36rpx; }
.label { font-size: 28rpx; color: #333; margin-bottom: 16rpx; display: block; }
.tags { display: flex; flex-wrap: wrap; gap: 12rpx; }
.tag { padding: 12rpx 20rpx; background: #f0f0f0; border-radius: 6rpx; font-size: 24rpx; }
.tag.active { background: #1677ff; color: #fff; }
.info { font-size: 24rpx; color: #999; margin-bottom: 12rpx; }
.btn-upload { margin-top: 40rpx; background: #1677ff; color: #fff; border-radius: 12rpx; height: 88rpx; line-height: 88rpx; }
.progress-link { text-align: center; margin-top: 30rpx; font-size: 28rpx; color: #1677ff; }
</style>
