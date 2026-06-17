<script setup lang="ts">
import { ref, onMounted } from 'vue'; import { useRouter } from 'vue-router'; import api from '@/api/index'; import { ElMessage, ElMessageBox } from 'element-plus'
import type { ShippingAddress } from '@/types'
const router = useRouter(); const list = ref<ShippingAddress[]>([]); const loading = ref(true)
onMounted(async () => { await fetchList() })
async function fetchList() { loading.value=true; try { const d = await api.get('/shipping-addresses'); list.value = d?.list??d??[] } catch {} finally { loading.value=false } }
async function del(id:string) { try { await ElMessageBox.confirm('确认删除该地址？','删除确认',{type:'warning'}); await api.delete(`/shipping-addresses/${id}`); ElMessage.success('已删除'); fetchList() } catch {} }
</script>

<template>
  <div class="address-page">
    <div class="page-header flex-between"><h1 class="page-header__title">收货地址</h1><el-button type="primary" @click="router.push('/address/edit')">新增地址</el-button></div>
    <el-empty v-if="!loading && list.length===0" description="暂无收货地址" />
    <div v-else class="address-grid">
    <div v-for="a in list" :key="a.id" class="page-card address-card"><div class="addr-info"><div class="addr-header"><span class="addr-name">{{ a.receiverName }}</span><span class="addr-phone">{{ a.phone }}</span><el-tag v-if="a.isDefault" size="small" type="success">默认</el-tag></div><p class="addr-detail">{{ a.province }}{{ a.city }}{{ a.district }} {{ a.detail }}</p></div><div class="addr-actions"><el-button size="small" @click="router.push(`/address/edit/${a.id}`)">编辑</el-button><el-button size="small" type="danger" @click="del(a.id)">删除</el-button></div></div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.address-page{max-width:1500px}
.address-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:$spacing-md}
.address-card{display:flex;justify-content:space-between;align-items:center}.addr-info{flex:1}.addr-header{display:flex;align-items:center;gap:$spacing-sm;margin-bottom:4px}.addr-name{font-weight:500}.addr-phone{color:$text-color-secondary;font-size:$font-size-sm}.addr-detail{font-size:$font-size-sm;color:$text-color-secondary}.addr-actions{display:flex;gap:$spacing-sm;flex-shrink:0}
</style>
