<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { PricingConfig } from '@/types'
import { getPricing, updatePricing } from '@/api/modules/admin'

function defaults(): PricingConfig {
  return {
    download: { unitPrice: 200, description: '按题计费' },
    print: [
      { tier: 1, minQuantity: 1, maxQuantity: 10, unitPrice: 500 },
      { tier: 2, minQuantity: 11, maxQuantity: 50, unitPrice: 400 },
      { tier: 3, minQuantity: 51, maxQuantity: null, unitPrice: 300 },
    ],
    cashback: { unitPrice: 100 },
    exerciseCashback: { unitPrice: 500 },
    exercise: { unitPrice: 500 },
  }
}

const pricing = ref<PricingConfig>(defaults())
const loading = ref(true)

function isDismissedMessageBoxAction(error: unknown) {
  return error === 'cancel' || error === 'close'
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function mergePricingConfig(remoteConfig: Partial<PricingConfig> | undefined): PricingConfig {
  const base = defaults()

  return {
    ...base,
    ...remoteConfig,
    download: { ...base.download, ...remoteConfig?.download },
    print: remoteConfig?.print?.length ? remoteConfig.print : base.print,
    cashback: { ...base.cashback, ...remoteConfig?.cashback },
    exerciseCashback: { ...base.exerciseCashback, ...remoteConfig?.exerciseCashback },
    exercise: { ...base.exercise, ...remoteConfig?.exercise },
  }
}

onMounted(async () => {
  try {
    const remoteConfig = await getPricing()
    pricing.value = mergePricingConfig(remoteConfig)
  }
  catch (error: unknown) {
    ElMessage.error(getErrorMessage(error, '定价配置加载失败'))
  }
  finally {
    loading.value = false
  }
})

async function save() {
  try {
    await ElMessageBox.confirm('确认更新定价配置？', '保存确认', { type: 'warning' })
    await updatePricing(pricing.value)
    ElMessage.success('定价已更新')
  }
  catch (error: unknown) {
    if (isDismissedMessageBoxAction(error)) {
      return
    }

    ElMessage.error(getErrorMessage(error, '定价更新失败'))
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-header__title">定价配置</h1>
    </div>
    <div v-loading="loading" class="page-card">
      <h3>下载服务（按题计费）</h3>
      <div class="mt-md">
        <label>单题价格（元）</label>
        <el-input-number
          v-model="pricing.download.unitPrice"
          :min="1"
          :step="50"
          size="large"
          class="ml-md"
        />
        分 = ¥{{ (pricing.download.unitPrice / 100).toFixed(2) }}
      </div>
      <p class="text-secondary mt-sm">
        示例：20题试卷 = ¥{{ ((pricing.download.unitPrice * 20) / 100).toFixed(2) }}
      </p>

      <h3 class="mt-lg">练习服务（单次抽取价格）</h3>
      <div class="mt-md">
        <label>每份价格（分）</label>
        <el-input-number
          v-model="pricing.exercise.unitPrice"
          :min="1"
          :step="50"
          size="large"
          class="ml-md"
        />
        分 = ¥{{ (pricing.exercise.unitPrice / 100).toFixed(2) }}/次
      </div>

      <h3 class="mt-lg">打印服务（分档计费）</h3>
      <div v-for="(tier, index) in pricing.print" :key="index" class="tier-row mt-md">
        <span>第{{ tier.tier }}档：</span>
        <el-input-number v-model="tier.minQuantity" :min="1" size="small" style="width: 100px" />
        -
        <el-input-number
          v-model="tier.maxQuantity"
          :min="tier.minQuantity"
          :placeholder="'不限'"
          size="small"
          style="width: 100px"
          :disabled="index === pricing.print.length - 1"
        />
        份，
        单价
        <el-input-number v-model="tier.unitPrice" :min="1" :step="50" size="small" />
        分 = ¥{{ (tier.unitPrice / 100).toFixed(2) }}/份
      </div>

      <h3 class="mt-lg">题库返现（教师贡献题通过审核）</h3>
      <div class="mt-md">
        <label>每题返现（分）</label>
        <el-input-number
          v-model="pricing.cashback.unitPrice"
          :min="1"
          :step="50"
          size="large"
          class="ml-md"
        />
        分 = ¥{{ (pricing.cashback.unitPrice / 100).toFixed(2) }}/题
      </div>

      <h3 class="mt-lg">练习返现（练习试卷审核通过）</h3>
      <div class="mt-md">
        <label>每卷返现（分）</label>
        <el-input-number
          v-model="pricing.exerciseCashback.unitPrice"
          :min="1"
          :step="50"
          size="large"
          class="ml-md"
        />
        分 = ¥{{ (pricing.exerciseCashback.unitPrice / 100).toFixed(2) }}/卷
      </div>

      <el-button type="primary" size="large" class="mt-lg save-button" @click="save">
        保存定价
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tier-row {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  flex-wrap: wrap;
}

.save-button {
  width: 100%;
}
</style>
