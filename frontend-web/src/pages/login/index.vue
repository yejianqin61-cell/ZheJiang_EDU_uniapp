<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const phone = ref('')
const smsCode = ref('')
const countdown = ref(0)
const submitting = ref(false)

const phoneValid = computed(() => /^1[3-9]\d{9}$/.test(phone.value))
const canSend = computed(() => phoneValid.value && countdown.value === 0)

let timer: ReturnType<typeof setInterval> | null = null

function startCountdown() {
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer!)
      timer = null
    }
  }, 1000)
}

async function handleSendSms() {
  if (!canSend.value) return
  try {
    await authStore.sendSmsCode(phone.value)
    ElMessage.success('验证码已发送')
    startCountdown()
  } catch {
    // 错误已在拦截器处理
  }
}

async function handleLogin() {
  if (!phoneValid.value) {
    ElMessage.warning('请输入正确的手机号')
    return
  }
  if (!smsCode.value) {
    ElMessage.warning('请输入验证码')
    return
  }
  submitting.value = true
  try {
    await authStore.loginWithSms(phone.value, smsCode.value)
    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) || '/'
    router.replace(redirect)
  } catch {
    // 错误已在拦截器处理
  } finally {
    submitting.value = false
  }
}

// Dev 快捷登录：直接调微信兼容接口，跳过短信
async function devQuickLogin() {
  submitting.value = true
  try {
    // 用旧微信登录接口，Dev模式下 code 即 openid，admin_test 自动成为管理员
    await authStore.devLogin('admin_test')
    ElMessage.success('Dev 登录成功')
    const redirect = (route.query.redirect as string) || '/'
    router.replace(redirect)
  } catch {
    // ignore
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1>🤖 AI智能组卷</h1>
        <p>中小学教师专属组卷平台</p>
      </div>

      <div class="login-form">
        <div class="form-item">
          <label>手机号</label>
          <el-input
            v-model="phone"
            placeholder="请输入手机号"
            maxlength="11"
            size="large"
            clearable
          />
        </div>

        <div class="form-item">
          <label>验证码</label>
          <div class="sms-row">
            <el-input
              v-model="smsCode"
              placeholder="请输入验证码"
              maxlength="6"
              size="large"
              @keyup.enter="handleLogin"
            />
            <el-button
              type="primary"
              size="large"
              :disabled="!canSend"
              :loading="authStore.loading"
              @click="handleSendSms"
            >
              {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </el-button>
          </div>
        </div>

        <el-button
          type="primary"
          size="large"
          class="login-btn"
          :loading="submitting"
          :disabled="!phoneValid || !smsCode"
          @click="handleLogin"
        >
          登录 / 注册
        </el-button>

        <p class="login-tip">首次登录将自动注册账号</p>

        <!-- Dev 快捷入口 -->
        <div class="dev-login" @click="devQuickLogin">
          🔧 Dev 快捷登录
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f4fd 0%, #f0f7ff 50%, #e8f4fd 100%);
}

.login-card {
  width: 420px;
  background: #fff;
  border-radius: $border-radius-lg;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.1);
  padding: 48px 40px;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;

  h1 {
    font-size: 28px;
    color: $color-primary;
    margin-bottom: $spacing-sm;
  }

  p {
    color: $text-color-secondary;
    font-size: $font-size-base;
  }
}

.login-form {
  .form-item {
    margin-bottom: $spacing-lg;

    label {
      display: block;
      font-size: $font-size-sm;
      color: $text-color;
      margin-bottom: $spacing-sm;
      font-weight: 500;
    }
  }

  .sms-row {
    display: flex;
    gap: $spacing-md;

    .el-input {
      flex: 1;
    }

    .el-button {
      min-width: 120px;
    }
  }

  .login-btn {
    width: 100%;
    margin-top: $spacing-md;
    height: 44px;
    font-size: $font-size-lg;
  }

  .login-tip {
    text-align: center;
    font-size: $font-size-xs;
    color: $text-color-placeholder;
    margin-top: $spacing-md;
  }

  .dev-login {
    margin-top: $spacing-lg;
    padding: $spacing-sm;
    text-align: center;
    font-size: $font-size-xs;
    color: $text-color-placeholder;
    cursor: pointer;
    border: 1px dashed $border-color;
    border-radius: $border-radius;

    &:hover {
      color: $color-primary;
      border-color: $color-primary-light;
    }
  }
}
</style>
