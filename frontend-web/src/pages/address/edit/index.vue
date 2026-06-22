<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  createAddress,
  getAddress,
  type ShippingAddressPayload,
  updateAddress,
} from '@/api/modules/address'

const route = useRoute()
const router = useRouter()
const form = ref<ShippingAddressPayload>({
  receiverName: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  isDefault: false,
})
const id = route.params.id as string | undefined
const isEdit = !!id

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '保存失败'
}

onMounted(async () => {
  if (!isEdit) {
    return
  }

  try {
    form.value = await getAddress(id!)
  }
  catch {
    router.back()
  }
})

async function submit() {
  if (!form.value.receiverName || !form.value.phone || !form.value.province || !form.value.city || !form.value.district || !form.value.detail) {
    ElMessage.warning('请填写完整地址信息')
    return
  }

  try {
    if (isEdit) {
      await updateAddress(id!, form.value)
    }
    else {
      await createAddress(form.value)
    }

    ElMessage.success(isEdit ? '已更新' : '已添加')
    router.back()
  }
  catch (error: unknown) {
    ElMessage.error(getErrorMessage(error))
  }
}
</script>

<template>
  <div class="edit-page">
    <div class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="breadcrumb__separator">›</span>
      <router-link to="/address">收货地址</router-link>
      <span class="breadcrumb__separator">›</span>
      <span class="breadcrumb__current">{{ isEdit ? '编辑地址' : '新增地址' }}</span>
    </div>
    <div class="page-card">
      <el-form label-position="top" @submit.prevent="submit">
        <el-form-item label="收货人">
          <el-input v-model="form.receiverName" placeholder="请输入收货人姓名" size="large" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" placeholder="请输入联系电话" size="large" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="省">
              <el-input v-model="form.province" placeholder="省" size="large" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="市">
              <el-input v-model="form.city" placeholder="市" size="large" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="区/县">
              <el-input v-model="form.district" placeholder="区/县" size="large" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="详细地址">
          <el-input
            v-model="form.detail"
            type="textarea"
            :rows="2"
            placeholder="街道、门牌号等"
            size="large"
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="form.isDefault">设为默认地址</el-checkbox>
        </el-form-item>
        <el-button type="primary" size="large" class="submit-button" @click="submit">保存</el-button>
      </el-form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.edit-page {
  max-width: 1500px;
}

.submit-button {
  width: 100%;
}
</style>
