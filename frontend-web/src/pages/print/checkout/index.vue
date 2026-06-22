<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { listAddresses } from '@/api/modules/address'
import { createOrder } from '@/api/modules/order'
import { getPublicPricing } from '@/api/modules/pricing'
import { useOrderStore } from '@/stores/order'
import type { PricingConfig, ShippingAddress } from '@/types'

const route = useRoute()
const router = useRouter()
const orderStore = useOrderStore()
const paperId = ref((route.query.paperId as string) || '')
const copies = ref(10)
const pricing = ref<PricingConfig | null>(null)
const addresses = ref<ShippingAddress[]>([])
const selectedAddr = ref('')
const submitting = ref(false)

onMounted(async () => {
  if (!paperId.value) {
    ElMessage.warning('请从试卷预览页进入')
    router.replace('/paper/config')
    return
  }

  try {
    pricing.value = await getPublicPricing()
  }
  catch {}

  try {
    addresses.value = await listAddresses()
  }
  catch {}
})

function hasResponse(error: unknown) {
  return typeof error === 'object' && error !== null && 'response' in error
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '创建订单失败'
}

function getTier() {
  if (!pricing.value) {
    return null
  }

  const tiers = pricing.value.print
  for (const tier of tiers) {
    if (copies.value >= tier.minQuantity && (tier.maxQuantity === null || copies.value <= tier.maxQuantity)) {
      return tier
    }
  }

  return tiers[tiers.length - 1]
}

function totalPrice() {
  const tier = getTier()
  return tier ? tier.unitPrice * copies.value : 0
}

async function handleSubmit() {
  if (!paperId.value) {
    ElMessage.warning('试卷信息丢失，请从预览页重新进入')
    return
  }

  if (!selectedAddr.value) {
    ElMessage.warning('请选择收货地址')
    return
  }

  submitting.value = true

  try {
    const result = await createOrder({
      paperId: paperId.value,
      type: 'print',
      copies: copies.value,
      shippingAddressId: selectedAddr.value,
    })
    orderStore.currentOrder = result
    ElMessage.success('订单已创建')
    router.push(`/payment?paperId=${paperId.value}&type=print`)
  }
  catch (error: unknown) {
    if (!hasResponse(error)) {
      ElMessage.error('创建订单失败')
      return
    }

    ElMessage.error(getErrorMessage(error))
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="checkout-page">
    <div class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="breadcrumb__separator">›</span>
      <span class="breadcrumb__current">打印服务</span>
    </div>
    <div class="page-card">
      <h3>打印份数</h3>
      <div class="mt-md">
        <el-input-number v-model="copies" :min="1" :max="500" size="large" />
        <span class="text-secondary">份</span>
      </div>
    </div>
    <div v-if="pricing" class="page-card mt-md">
      <h3>分档计费</h3>
      <el-table :data="pricing.print" class="mt-md" size="small">
        <el-table-column prop="tier" label="档位" width="60" />
        <el-table-column label="份数范围">
          <template #default="{ row }">{{ row.minQuantity }} - {{ row.maxQuantity ?? '不限' }} 份</template>
        </el-table-column>
        <el-table-column label="单价">
          <template #default="{ row }">¥{{ (row.unitPrice / 100).toFixed(2) }} / 份</template>
        </el-table-column>
      </el-table>
      <div class="total-row mt-md">
        <span>当前档位单价 ¥{{ ((getTier()?.unitPrice ?? 0) / 100).toFixed(2) }} × {{ copies }} 份</span>
        <span class="total-price">= ¥{{ (totalPrice() / 100).toFixed(2) }}</span>
      </div>
    </div>
    <div class="page-card mt-md">
      <h3>收货地址</h3>
      <el-select v-model="selectedAddr" placeholder="选择收货地址" size="large" style="width: 100%" class="mt-md">
        <el-option
          v-for="address in addresses"
          :key="address.id"
          :label="`${address.receiverName} ${address.phone} ${address.province}${address.city}${address.district}${address.detail}`"
          :value="address.id"
        />
      </el-select>
      <el-button class="mt-sm" @click="router.push('/address/edit')">+ 新增地址</el-button>
    </div>
    <el-button type="primary" size="large" :loading="submitting" class="submit-button mt-md" @click="handleSubmit">
      确认下单 ¥{{ (totalPrice() / 100).toFixed(2) }}
    </el-button>
  </div>
</template>

<style scoped lang="scss">
.checkout-page {
  max-width: 1500px;
}

.total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: $font-size-base;
}

.total-price {
  font-size: $font-size-xl;
  font-weight: 700;
  color: $color-danger;
}

.submit-button {
  min-width: 240px;
}
</style>
