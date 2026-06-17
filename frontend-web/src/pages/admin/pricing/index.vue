<script setup lang="ts">
import { ref, onMounted } from 'vue'; import api from '@/api/index'; import { ElMessage, ElMessageBox } from 'element-plus'
import type { PricingConfig } from '@/types'
const pricing = ref<PricingConfig>({
  download:{unitPrice:200,description:'按题计费'},
  print:[{tier:1,minQuantity:1,maxQuantity:10,unitPrice:500},{tier:2,minQuantity:11,maxQuantity:50,unitPrice:400},{tier:3,minQuantity:51,maxQuantity:null,unitPrice:300}],
  cashback:{unitPrice:100},
  exerciseCashback:{unitPrice:500},
  exercise:{unitPrice:500},
})
const loading = ref(true)
onMounted(async () => { try { pricing.value = await api.get('/admin/pricing') } catch {} finally { loading.value = false } })
async function save() {
  try { await ElMessageBox.confirm('确认更新定价配置？','保存确认',{type:'warning'}); await api.put('/admin/pricing',pricing.value); ElMessage.success('定价已更新') } catch {}
}
</script>

<template>
  <div>
    <div class="page-header"><h1 class="page-header__title">定价配置</h1></div>
    <div class="page-card" v-loading="loading">
      <h3>下载服务（按题计费）</h3>
      <div class="mt-md"><label>单题价格（元）</label><el-input-number v-model="pricing.download.unitPrice" :min="1" :step="50" size="large" class="ml-md"/> 分 = ¥{{ (pricing.download.unitPrice/100).toFixed(2) }}</div>
      <p class="text-secondary mt-sm">示例：20题试卷 = ¥{{ (pricing.download.unitPrice*20/100).toFixed(2) }}</p>

      <h3 class="mt-lg">练习服务（单次抽取价格）</h3>
      <div class="mt-md"><label>每份价格（分）</label><el-input-number v-model="pricing.exercise!.unitPrice" :min="1" :step="50" size="large" class="ml-md"/> 分 = ¥{{ ((pricing.exercise?.unitPrice??500)/100).toFixed(2) }}/次</div>

      <h3 class="mt-lg">打印服务（分档计费）</h3>
      <div v-for="(t,i) in pricing.print" :key="i" class="tier-row mt-md">
        <span>第{{ t.tier }}档：</span>
        <el-input-number v-model="t.minQuantity" :min="1" size="small" style="width:100px"/> -
        <el-input-number v-model="t.maxQuantity" :min="t.minQuantity" :placeholder="'不限'" size="small" style="width:100px" :disabled="i===pricing.print.length-1"/> 份，
        单价 <el-input-number v-model="t.unitPrice" :min="1" :step="50" size="small"/> 分 = ¥{{ (t.unitPrice/100).toFixed(2) }}/份
      </div>

      <h3 class="mt-lg">题库返现（教师贡献题通过审核）</h3>
      <div class="mt-md"><label>每题返现（分）</label><el-input-number v-model="pricing.cashback!.unitPrice" :min="1" :step="50" size="large" class="ml-md"/> 分 = ¥{{ ((pricing.cashback?.unitPrice??100)/100).toFixed(2) }}/题</div>

      <h3 class="mt-lg">练习返现（练习试卷审核通过）</h3>
      <div class="mt-md"><label>每卷返现（分）</label><el-input-number v-model="pricing.exerciseCashback!.unitPrice" :min="1" :step="50" size="large" class="ml-md"/> 分 = ¥{{ ((pricing.exerciseCashback?.unitPrice??500)/100).toFixed(2) }}/卷</div>

      <el-button type="primary" size="large" @click="save" class="mt-lg" style="width:100%">保存定价</el-button>
    </div>
  </div>
</template>
<style scoped lang="scss">
.tier-row{display:flex;align-items:center;gap:$spacing-sm;flex-wrap:wrap}
</style>
