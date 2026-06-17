<script setup lang="ts">
import { useRouter } from 'vue-router'; import { useAuthStore } from '@/stores/auth'
const router = useRouter(); const auth = useAuthStore()
const menus: any[] = [
  { label:'我的余额', path:'/profile/balance', icon:'💰' },
  { label:'提现', path:'/profile/withdraw', icon:'💳' },
  { label:'我的贡献', path:'/contribute', icon:'📤' },
  { label:'收货地址', path:'/address', icon:'📍' },
]
if(auth.isAdmin) menus.push({ label:'管理后台', path:'/admin/dashboard', icon:'⚙️' })
</script>

<template>
  <div class="profile-page">
    <div class="page-header"><h1 class="page-header__title">个人中心</h1></div>
    <div class="page-card user-card"><span class="user-avatar">👤</span><div class="user-info"><h2>{{ auth.phoneMasked||'用户' }}</h2><el-tag :type="auth.isAdmin?'danger':''" size="small">{{ auth.isAdmin?'管理员':'教师' }}</el-tag></div></div>
    <div class="page-card mt-md"><div class="menu-list"><div v-for="m in menus" :key="m.path" class="menu-item" @click="router.push(m.path)"><span class="menu-icon">{{ m.icon }}</span><span class="menu-label">{{ m.label }}</span><span class="menu-arrow">›</span></div></div></div>
    <div class="logout-section"><el-button type="danger" @click="auth.logout">退出登录</el-button></div>
  </div>
</template>
<style scoped lang="scss">
.profile-page{max-width:600px;margin:0 auto}
.user-card{display:flex;align-items:center;gap:$spacing-lg;.user-avatar{font-size:48px}.user-info{h2{font-size:$font-size-xl;margin-bottom:4px}}}
.menu-item{display:flex;align-items:center;padding:14px 0;cursor:pointer;border-bottom:1px solid #f5f5f5;&:last-child{border-bottom:none}&:hover{color:$color-primary}.menu-icon{font-size:20px;margin-right:$spacing-md}.menu-label{flex:1}.menu-arrow{color:$text-color-placeholder}}
.logout-section{text-align:center;padding:$spacing-xl 0}
</style>
