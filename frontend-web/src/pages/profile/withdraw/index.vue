<script setup lang="ts">
import { ref, onMounted } from 'vue'; import { useRouter } from 'vue-router'; import api from '@/api/index'; import { ElMessage } from 'element-plus'
const router = useRouter(); const balance = ref(0); const amount = ref(0); const submitting = ref(false)
onMounted(async () => { try { const d = await api.get('/users/me/balance'); balance.value = d?.balance??0 } catch {} })
async function submit() { if(amount.value<=0){ElMessage.warning('请输入金额');return}; if(amount.value*100>balance.value){ElMessage.warning('余额不足');return}; submitting.value=true; try { await api.post('/withdrawals',{amount:amount.value*100}); ElMessage.success('提现申请已提交'); router.back() } catch(e:any) { ElMessage.error(e?.message??'提交失败') } finally { submitting.value=false } }
</script>

<template>
  <div class="withdraw-page">
    <div class="breadcrumb"><router-link to="/">首页</router-link><span class="breadcrumb__separator">›</span><router-link to="/profile">个人中心</router-link><span class="breadcrumb__separator">›</span><span class="breadcrumb__current">提现</span></div>
    <div class="page-card"><h3>申请提现</h3><p class="text-secondary mt-sm">可用余额：¥{{ (balance/100).toFixed(2) }}</p><div class="mt-md"><el-input v-model="amount" type="number" placeholder="请输入提现金额（元）" size="large"><template #append>元</template></el-input></div><el-button type="primary" size="large" :loading="submitting" @click="submit" class="mt-md" style="width:100%">提交提现申请</el-button></div>
  </div>
</template>
<style scoped lang="scss">.withdraw-page{max-width:500px;margin:0 auto}</style>
