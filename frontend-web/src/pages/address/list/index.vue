<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteAddress, listAddresses } from '@/api/modules/address'
import type { ShippingAddress } from '@/types'

const router = useRouter()
const list = ref<ShippingAddress[]>([])
const loading = ref(true)

onMounted(async () => {
  await fetchList()
})

async function fetchList() {
  loading.value = true

  try {
    list.value = await listAddresses()
  }
  catch {
    list.value = []
  }
  finally {
    loading.value = false
  }
}

async function del(id: string) {
  try {
    await ElMessageBox.confirm('确认删除该地址？', '删除确认', { type: 'warning' })
    await deleteAddress(id)
    ElMessage.success('已删除')
    await fetchList()
  }
  catch {}
}
</script>

<template>
  <div class="address-page">
    <div class="page-header flex-between">
      <h1 class="page-header__title">收货地址</h1>
      <el-button type="primary" @click="router.push('/address/edit')">新增地址</el-button>
    </div>
    <el-empty v-if="!loading && list.length === 0" description="暂无收货地址" />
    <div v-else class="address-grid">
      <div v-for="address in list" :key="address.id" class="page-card address-card">
        <div class="addr-info">
          <div class="addr-header">
            <span class="addr-name">{{ address.receiverName }}</span>
            <span class="addr-phone">{{ address.phone }}</span>
            <el-tag v-if="address.isDefault" size="small" type="success">默认</el-tag>
          </div>
          <p class="addr-detail">{{ address.province }}{{ address.city }}{{ address.district }} {{ address.detail }}</p>
        </div>
        <div class="addr-actions">
          <el-button size="small" @click="router.push(`/address/edit/${address.id}`)">编辑</el-button>
          <el-button size="small" type="danger" @click="del(address.id)">删除</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.address-page {
  max-width: 1500px;
}

.address-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: $spacing-md;
}

.address-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.addr-info {
  flex: 1;
}

.addr-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: 4px;
}

.addr-name {
  font-weight: 500;
}

.addr-phone,
.addr-detail {
  font-size: $font-size-sm;
  color: $text-color-secondary;
}

.addr-actions {
  display: flex;
  flex-shrink: 0;
  gap: $spacing-sm;
}
</style>
