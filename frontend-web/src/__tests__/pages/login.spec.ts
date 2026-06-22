import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth'
import LoginPage from '@/pages/login/index.vue'
import { elInputStub } from '@/__tests__/utils/element-plus-stubs'

const routerReplace = vi.fn()
const routeState = vi.hoisted(() => ({
  query: { redirect: '/profile' as string | undefined },
}))
const authModuleMocks = vi.hoisted(() => ({
  sendSms: vi.fn(),
  sendEmailCode: vi.fn(),
  login: vi.fn(),
  registerByEmail: vi.fn(),
  loginByPassword: vi.fn(),
  devLogin: vi.fn(),
  getProfile: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    replace: routerReplace,
  }),
  useRoute: () => routeState,
}))

vi.mock('@/api/modules/auth', () => ({
  sendSms: authModuleMocks.sendSms,
  sendEmailCode: authModuleMocks.sendEmailCode,
  login: authModuleMocks.login,
  registerByEmail: authModuleMocks.registerByEmail,
  loginByPassword: authModuleMocks.loginByPassword,
  devLogin: authModuleMocks.devLogin,
  getProfile: authModuleMocks.getProfile,
}))

const mountPage = (pinia = createPinia()) =>
  mount(LoginPage, {
    global: {
      plugins: [pinia],
      stubs: {
        'el-input': elInputStub,
        'el-button': { template: '<button><slot /></button>' },
      },
    },
  })

describe('Login page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    routeState.query.redirect = '/profile'
    routerReplace.mockReset()
    authModuleMocks.sendSms.mockReset()
    authModuleMocks.sendEmailCode.mockReset()
    authModuleMocks.login.mockReset()
    authModuleMocks.registerByEmail.mockReset()
    authModuleMocks.loginByPassword.mockReset()
    authModuleMocks.devLogin.mockReset()
    authModuleMocks.getProfile.mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.success).mockReset()
  })

  it('warns when email is invalid for password login', async () => {
    const wrapper = mountPage()
    ;(wrapper.vm as any).loginEmail = 'invalid-email'
    ;(wrapper.vm as any).loginPassword = '123456'

    await (wrapper.vm as any).handleEmailLogin()

    expect(ElMessage.warning).toHaveBeenCalledWith('请输入正确的邮箱')
  })

  it('registers with email and redirects on success', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    authModuleMocks.getProfile.mockResolvedValue({ phone: '13800138000', role: 'teacher' })
    authModuleMocks.registerByEmail.mockResolvedValueOnce({ accessToken: 'token-register', role: 'teacher' })

    const wrapper = mountPage(pinia)
    ;(wrapper.vm as any).regEmail = 'teacher@example.com'
    ;(wrapper.vm as any).regCode = '123456'
    ;(wrapper.vm as any).regPassword = '123456'
    ;(wrapper.vm as any).regPassword2 = '123456'

    await (wrapper.vm as any).handleRegister()
    await nextTick()

    expect(authModuleMocks.registerByEmail).toHaveBeenCalledWith('teacher@example.com', '123456', '123456')
    expect(localStorage.getItem('accessToken')).toBe('token-register')
    expect(ElMessage.success).toHaveBeenCalledWith('登录成功')
    expect(routerReplace).toHaveBeenCalledWith('/profile')
  })

  it('sends registration email code with auth api module', async () => {
    authModuleMocks.sendEmailCode.mockResolvedValue(undefined)
    const wrapper = mountPage()
    ;(wrapper.vm as any).regEmail = 'teacher@example.com'

    await (wrapper.vm as any).handleSendRegCode()

    expect(authModuleMocks.sendEmailCode).toHaveBeenCalledWith('teacher@example.com')
    expect(ElMessage.success).toHaveBeenCalledWith('验证码已发送，请查看邮箱')
  })

  it('sends sms and logs in with phone', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    authModuleMocks.sendSms.mockResolvedValue(undefined)
    authModuleMocks.login.mockResolvedValue({ accessToken: 'token-sms', role: 'teacher', phone: '13800138000' })

    const wrapper = mountPage(pinia)
    ;(wrapper.vm as any).activeTab = 'phone'
    ;(wrapper.vm as any).phone = '13800138000'
    ;(wrapper.vm as any).smsCode = '123456'

    await (wrapper.vm as any).handleSendSms()
    await (wrapper.vm as any).handlePhoneLogin()

    expect(authModuleMocks.sendSms).toHaveBeenCalledWith('13800138000')
    expect(authModuleMocks.login).toHaveBeenCalledWith('13800138000', '123456')
    expect(ElMessage.success).toHaveBeenCalledWith('验证码已发送')
    expect(routerReplace).toHaveBeenCalledWith('/profile')
  })

  it('logs in with email and redirects on success', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    authModuleMocks.getProfile.mockResolvedValue({ phone: '13800138000', role: 'teacher' })
    authModuleMocks.loginByPassword.mockResolvedValueOnce({ accessToken: 'token-email', role: 'teacher' })

    const wrapper = mountPage(pinia)
    ;(wrapper.vm as any).loginEmail = 'teacher@example.com'
    ;(wrapper.vm as any).loginPassword = 'secret123'

    await (wrapper.vm as any).handleEmailLogin()
    await nextTick()

    expect(authModuleMocks.loginByPassword).toHaveBeenCalledWith('teacher@example.com', 'secret123')
    expect(localStorage.getItem('accessToken')).toBe('token-email')
    expect(routerReplace).toHaveBeenCalledWith('/profile')
  })

  it('dev login redirects to homepage when redirect is missing', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    routeState.query.redirect = undefined
    authModuleMocks.devLogin.mockResolvedValue({
      accessToken: 'token-dev',
      phone: '13800138000',
      user: { role: 'admin' },
    })

    const wrapper = mountPage(pinia)

    await (wrapper.vm as any).devLoginAs('admin')

    expect(authModuleMocks.devLogin).toHaveBeenCalledWith('admin_test')
    expect(routerReplace).toHaveBeenCalledWith('/')
  })
})
