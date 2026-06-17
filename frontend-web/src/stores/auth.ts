import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { sendSms, login, devLogin, getProfile, type LoginResponse } from '@/api/modules/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('accessToken') || '')
  const user = ref<{ phone?: string; role: string } | null>(null)
  const loading = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const phoneMasked = computed(() => {
    const p = user.value?.phone
    if (!p) return ''
    return p.slice(0, 3) + '****' + p.slice(-4)
  })

  // 从 token 解析用户信息
  function parseToken(): void {
    if (!token.value) return
    try {
      const payload = JSON.parse(atob(token.value.split('.')[1]))
      user.value = { phone: payload.phone, role: payload.role }
    } catch {
      // token 无效，清除
      token.value = ''
      localStorage.removeItem('accessToken')
    }
  }

  // 发送验证码
  async function sendSmsCode(phone: string): Promise<void> {
    loading.value = true
    try {
      await sendSms(phone)
    } finally {
      loading.value = false
    }
  }

  // 短信验证码登录
  async function loginWithSms(phone: string, smsCode: string): Promise<LoginResponse> {
    loading.value = true
    try {
      const res = await login(phone, smsCode)
      token.value = res.accessToken
      localStorage.setItem('accessToken', res.accessToken)
      user.value = { phone: res.phone || phone, role: res.role }
      return res
    } finally {
      loading.value = false
    }
  }

  // Dev 快捷登录
  async function devLoginWithCode(code: string): Promise<LoginResponse> {
    loading.value = true
    try {
      const res = await devLogin(code)
      token.value = res.accessToken
      localStorage.setItem('accessToken', res.accessToken)
      // Dev 登录返回的是 user 对象（微信兼容）
      const userData = (res as any).user
      user.value = {
        phone: res.phone,
        role: userData?.role || res.role || 'admin',
      }
      return res
    } finally {
      loading.value = false
    }
  }

  // 获取用户信息（用于刷新后恢复）
  async function fetchProfile(): Promise<void> {
    try {
      const profile = await getProfile()
      user.value = { phone: profile.phone, role: profile.role }
    } catch {
      // 获取失败，从 token 解析
      parseToken()
    }
  }

  // 退出登录
  function logout(): void {
    token.value = ''
    user.value = null
    localStorage.removeItem('accessToken')
    window.location.href = '/login'
  }

  // 初始化：从 token 恢复
  parseToken()

  return {
    token,
    user,
    loading,
    isLoggedIn,
    isAdmin,
    phoneMasked,
    sendSmsCode,
    loginWithSms,
    devLogin: devLoginWithCode,
    fetchProfile,
    logout,
  }
})
