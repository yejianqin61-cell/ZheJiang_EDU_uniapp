<script setup lang="ts">
import { ref, onMounted } from 'vue'; import { useRoute, useRouter } from 'vue-router'; import api from '@/api/index'; import { ElMessage } from 'element-plus'
import type { PricingConfig, ShippingAddress } from '@/types'
const route = useRoute(); const router = useRouter()
const paperId = ref((route.query.paperId as string)||'')
const copies = ref(10); const pricing = ref<PricingConfig|null>(null)
const addresses = ref<ShippingAddress[]>([]); const selectedAddr = ref(''); const submitting = ref(false)

onMounted(async () => {
  try { pricing.value = await api.get('/pricing/public') } catch {}
  try { const d = await api.get('/shipping-addresses'); addresses.value = d?.list??d??[] } catch {}
})

function getTier() { if(!pricing.value) return null; const ps = pricing.value.print; for(const t of ps) { if(copies.value>=t.minQuantity && (t.maxQuantity===null||copies.value<=t.maxQuantity)) return t } return ps[ps.length-1] }
function totalPrice() { const t = getTier(); return t?t.unitPrice*copies.value:0 }

async function handleSubmit() {
  if(!selectedAddr.value){ElMessage.warning('请选择收货地址');return}
  submitting.value=true
  try { await api.post('/orders',{paperId:paperId.value,type:'print',copies:copies.value,shippingAddressId:selectedAddr.value}); ElMessage.success('订单已创建'); router.push('/payment?type=print') } catch(e:any) { ElMessage.error(e?.message??'创建订单失败') } finally { submitting.value=false }
}
</script>

<template>
  <div class="checkout-page">
    <div class="breadcrumb"><router-link to="/">首页</router-link><span class="breadcrumb__separator">›</span><span class="breadcrumb__current">打印服务</span></div>
    <div class="page-card"><h3>打印份数</h3><div class="mt-md"><el-input-number v-model="copies" :min="1" :max="500" size="large" /> <span class="text-secondary">份</span></div></div>
    <div class="page-card mt-md" v-if="pricing"><h3>分档计费</h3><el-table :data="pricing.print" class="mt-md" size="small"><el-table-column prop="tier" label="档位" width="60"/><el-table-column label="份数范围"><template #default="{row}">{{ row.minQuantity }} - {{ row.maxQuantity??'不限' }} 份</template></el-table-column><el-table-column label="单价"><template #default="{row}">¥{{ (row.unitPrice/100).toFixed(2) }} / 份</template></el-table-column></el-table>
      <div class="total-row mt-md"><span>当前档位单价 ¥{{ ((getTier()?.unitPrice??0)/100).toFixed(2) }} × {{ copies }} 份</span><span class="total-price">= ¥{{ (totalPrice()/100).toFixed(2) }}</span></div></div>
    <div class="page-card mt-md"><h3>收货地址</h3><el-select v-model="selectedAddr" placeholder="选择收货地址" size="large" style="width:100%" class="mt-md"><el-option v-for="a in addresses" :key="a.id" :label="`${a.receiverName} ${a.phone} ${a.province}${a.city}${a.district}${a.detail}`" :value="a.id"/></el-select>
      <el-button class="mt-sm" @click="router.push('/address/edit')">+ 新增地址</el-button></div>
    <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit" class="mt-md" style="width:100%">确认下单 ¥{{ (totalPrice()/100).toFixed(2) }}</el-button>
  </div>
</template>
<style scoped lang="scss">
.checkout-page{max-width:600px;margin:0 auto}
.total-row{display:flex;justify-content:space-between;align-items:center;font-size:$font-size-base}.total-price{font-size:$font-size-xl;font-weight:700;color:$color-danger}
</style>
