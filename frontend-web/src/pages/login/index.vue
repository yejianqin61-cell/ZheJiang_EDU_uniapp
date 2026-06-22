<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { loginByPassword, registerByEmail, sendEmailCode } from '@/api/modules/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const activeTab = ref<'email' | 'phone'>('email')

// 手机号登录
const phone = ref('')
const smsCode = ref('')
const smsCountdown = ref(0)
let smsTimer: ReturnType<typeof setInterval> | null = null

const phoneValid = computed(() => /^1[3-9]\d{9}$/.test(phone.value))

function startSmsCountdown() {
  smsCountdown.value = 60
  smsTimer = setInterval(() => {
    smsCountdown.value--
    if (smsCountdown.value <= 0) { clearInterval(smsTimer!); smsTimer = null }
  }, 1000)
}

async function handleSendSms() {
  if (!phoneValid.value || smsCountdown.value > 0) return
  try { await authStore.sendSmsCode(phone.value); ElMessage.success('验证码已发送'); startSmsCountdown() } catch { /* */ }
}

async function handlePhoneLogin() {
  if (!phoneValid.value) { ElMessage.warning('请输入正确的手机号'); return }
  if (!smsCode.value) { ElMessage.warning('请输入验证码'); return }
  try { await authStore.loginWithSms(phone.value, smsCode.value); doRedirect() } catch { /* */ }
}

// 邮箱注册
const regEmail = ref('')
const regCode = ref('')
const regPassword = ref('')
const regPassword2 = ref('')
const regCountdown = ref(0)
const regSubmitting = ref(false)
let regTimer: ReturnType<typeof setInterval> | null = null

function startRegCountdown() {
  regCountdown.value = 60
  regTimer = setInterval(() => {
    regCountdown.value--
    if (regCountdown.value <= 0) { clearInterval(regTimer!); regTimer = null }
  }, 1000)
}

async function handleSendRegCode() {
  if (!regEmail.value.includes('@')) { ElMessage.warning('请输入正确的邮箱'); return }
  if (regCountdown.value > 0) return
  try {
    await sendEmailCode(regEmail.value)
    ElMessage.success('验证码已发送，请查看邮箱')
    startRegCountdown()
  } catch { /* */ }
}

async function handleRegister() {
  if (!regEmail.value.includes('@')) { ElMessage.warning('请输入正确的邮箱'); return }
  if (!regCode.value) { ElMessage.warning('请输入验证码'); return }
  if (regPassword.value.length < 6) { ElMessage.warning('密码至少6位'); return }
  if (regPassword.value !== regPassword2.value) { ElMessage.warning('两次密码不一致'); return }
  regSubmitting.value = true
  try {
    const res = await registerByEmail(regEmail.value, regCode.value, regPassword.value)
    authStore.token = res.accessToken
    localStorage.setItem('accessToken', res.accessToken)
    authStore.fetchProfile()
    doRedirect()
  } catch { /* */ } finally { regSubmitting.value = false }
}

// 邮箱登录
const loginEmail = ref('')
const loginPassword = ref('')
const loginSubmitting = ref(false)

async function handleEmailLogin() {
  if (!loginEmail.value.includes('@')) { ElMessage.warning('请输入正确的邮箱'); return }
  if (!loginPassword.value) { ElMessage.warning('请输入密码'); return }
  loginSubmitting.value = true
  try {
    const res = await loginByPassword(loginEmail.value, loginPassword.value)
    authStore.token = res.accessToken
    localStorage.setItem('accessToken', res.accessToken)
    authStore.fetchProfile()
    doRedirect()
  } catch { /* */ } finally { loginSubmitting.value = false }
}

function doRedirect() {
  ElMessage.success('登录成功')
  const redirect = (route.query.redirect as string) || '/'
  router.replace(redirect)
}

// Dev 快捷登录
async function devLoginAs(role: 'admin' | 'teacher') {
  try {
    const code = role === 'admin' ? 'admin_test' : 'teacher_test'
    await authStore.devLogin(code)
    ElMessage.success(`Dev ${role} 登录成功`)
    router.replace((route.query.redirect as string) || '/')
  } catch { /* */ }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1>瓯越AI组题网</h1>
        <p>中小学教师专属组题平台</p>
      </div>

      <!-- Tab 切换 -->
      <div class="login-tabs">
        <span :class="{ active: activeTab === 'email' }" @click="activeTab = 'email'">邮箱登录</span>
        <span :class="{ active: activeTab === 'phone' }" @click="activeTab = 'phone'">手机号登录</span>
      </div>

      <!-- 邮箱登录 -->
      <div v-if="activeTab === 'email'" class="login-form">
        <div class="form-item">
          <label>邮箱</label>
          <el-input v-model="loginEmail" placeholder="请输入邮箱" size="large" clearable @keyup.enter="handleEmailLogin" />
        </div>
        <div class="form-item">
          <label>密码</label>
          <el-input v-model="loginPassword" type="password" placeholder="请输入密码" size="large" show-password @keyup.enter="handleEmailLogin" />
        </div>
        <el-button type="primary" size="large" class="login-btn" :loading="loginSubmitting" @click="handleEmailLogin">登录</el-button>

        <!-- 注册区 -->
        <div class="register-section">
          <div class="divider"><span>没有账号？快速注册</span></div>
          <div class="form-item">
            <label>邮箱</label>
            <el-input v-model="regEmail" placeholder="请输入邮箱" size="large" clearable />
          </div>
          <div class="form-item">
            <label>验证码</label>
            <div class="sms-row">
              <el-input v-model="regCode" placeholder="6位验证码" maxlength="6" size="large" />
              <el-button type="primary" size="large" :disabled="regCountdown > 0" @click="handleSendRegCode">{{ regCountdown > 0 ? `${regCountdown}s` : '发送验证码' }}</el-button>
            </div>
          </div>
          <div class="form-item">
            <label>密码</label>
            <el-input v-model="regPassword" type="password" placeholder="至少6位" size="large" show-password />
          </div>
          <div class="form-item">
            <label>确认密码</label>
            <el-input v-model="regPassword2" type="password" placeholder="再次输入密码" size="large" show-password />
          </div>
          <el-button type="success" size="large" class="login-btn" :loading="regSubmitting" @click="handleRegister">注册</el-button>
        </div>
      </div>

      <!-- 手机号登录 -->
      <div v-if="activeTab === 'phone'" class="login-form">
        <div class="form-item">
          <label>手机号</label>
          <el-input v-model="phone" placeholder="请输入手机号" maxlength="11" size="large" clearable />
        </div>
        <div class="form-item">
          <label>验证码</label>
          <div class="sms-row">
            <el-input v-model="smsCode" placeholder="请输入验证码" maxlength="6" size="large" @keyup.enter="handlePhoneLogin" />
            <el-button type="primary" size="large" :disabled="!phoneValid || smsCountdown > 0" :loading="authStore.loading" @click="handleSendSms">{{ smsCountdown > 0 ? `${smsCountdown}s` : '获取验证码' }}</el-button>
          </div>
        </div>
        <el-button type="primary" size="large" class="login-btn" :disabled="!phoneValid || !smsCode" @click="handlePhoneLogin">登录 / 注册</el-button>
        <p class="login-tip">首次登录将自动注册账号</p>
      </div>

      <!-- Dev 快捷入口 -->
      <div class="dev-section">
        <div class="dev-login" @click="devLoginAs('admin')">管理员登录</div>
        <div class="dev-login" @click="devLoginAs('teacher')">教师登录</div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #fef5e7 0%, #fdf2e9 50%, #fef5e7 100%);
}
.login-card {
  width: 440px; max-height: 90vh; overflow-y: auto; background: #fff; border-radius: $border-radius-lg;
  box-shadow: 0 8px 40px rgba(0,0,0,0.1); padding: 40px 36px;
}
.login-header {
  text-align: center; margin-bottom: 28px;
  h1 { font-family: $font-display; font-size: 26px; color: $color-primary; margin-bottom: 4px; }
  p { color: $text-color-secondary; font-size: $font-size-sm; }
}
.login-tabs {
  display: flex; border-bottom: 2px solid $border-color; margin-bottom: 20px;
  span { flex: 1; text-align: center; padding: 10px 0; cursor: pointer; font-size: $font-size-base; color: $text-color-secondary; transition: color 0.2s; border-bottom: 2px solid transparent; margin-bottom: -2px;
    &:hover { color: $color-primary; }
    &.active { color: $color-primary; border-bottom-color: $color-primary; font-weight: 600; }
  }
}
.login-form {
  .form-item { margin-bottom: $spacing-md;
    label { display: block; font-size: $font-size-sm; color: $text-color; margin-bottom: 4px; font-weight: 500; }
  }
  .sms-row { display: flex; gap: $spacing-sm;
    .el-input { flex: 1; }
    .el-button { min-width: 110px; white-space: nowrap; }
  }
  .login-btn { width: 100%; height: 44px; font-size: $font-size-lg; }
  .login-tip { text-align: center; font-size: $font-size-xs; color: $text-color-placeholder; margin-top: $spacing-sm; }
}
.register-section { margin-top: $spacing-lg;
  .divider { text-align: center; margin-bottom: $spacing-md; position: relative;
    span { background: #fff; padding: 0 12px; font-size: $font-size-xs; color: $text-color-placeholder; position: relative; z-index: 1; }
    &::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; border-top: 1px solid $border-color; }
  }
}
.dev-section { margin-top: $spacing-lg; display: flex; gap: $spacing-sm; }
.dev-login { flex: 1; padding: $spacing-sm; text-align: center; font-size: $font-size-xs; color: $text-color-placeholder; cursor: pointer; border: 1px dashed $border-color; border-radius: $border-radius;
  &:hover { color: $color-primary; border-color: $color-primary-light; }
}
</style>
