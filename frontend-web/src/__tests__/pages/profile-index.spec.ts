import { ElMessage } from 'element-plus'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth'
import ProfileIndexPage from '@/pages/profile/index.vue'

const routerPush = vi.fn()
const authApiMocks = vi.hoisted(() => ({
  getUserStats: vi.fn(),
  getMyBalance: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}))

vi.mock('@/api/modules/auth', async () => {
  const actual = await vi.importActual<typeof import('@/api/modules/auth')>('@/api/modules/auth')
  return {
    ...actual,
    getUserStats: authApiMocks.getUserStats,
    getMyBalance: authApiMocks.getMyBalance,
  }
})

const mountPage = (pinia = createPinia()) =>
  mount(ProfileIndexPage, {
    global: {
      plugins: [pinia],
      stubs: {
        'el-tag': { template: '<span><slot /></span>' },
        'el-button': { template: '<button><slot /></button>' },
      },
    },
  })

describe('Profile index page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    routerPush.mockReset()
    authApiMocks.getUserStats.mockReset()
    authApiMocks.getMyBalance.mockReset()
    vi.mocked(ElMessage.error).mockReset()
    localStorage.clear()
  })

  it('loads user stats and balance on mount', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore()
    auth.user = { phone: '13800138000', role: 'teacher' }
    authApiMocks.getUserStats.mockResolvedValue({ totalPapers: 5, totalPaid: 2, todayRegenerates: 1 })
    authApiMocks.getMyBalance.mockResolvedValue({ balance: 1200 })

    const wrapper = mountPage(pinia)
    await nextTick()
    await flushPromises()

    expect(authApiMocks.getUserStats).toHaveBeenCalledTimes(1)
    expect(authApiMocks.getMyBalance).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('138****8000')
    expect(wrapper.text()).toContain('已生成试卷')
    expect(wrapper.text()).toContain('已支付订单')
    expect(wrapper.text()).toContain('¥12.00')
  })

  it('shows error when user stats load fails', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore()
    auth.user = { phone: '13800138000', role: 'teacher' }
    authApiMocks.getUserStats.mockRejectedValue(new Error('统计加载失败'))
    authApiMocks.getMyBalance.mockResolvedValue({ balance: 0 })

    mountPage(pinia)
    await nextTick()
    await flushPromises()

    expect(ElMessage.error).toHaveBeenCalledWith('统计加载失败')
  })

  it('shows error when balance load fails', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore()
    auth.user = { phone: '13800138000', role: 'teacher' }
    authApiMocks.getUserStats.mockResolvedValue({ totalPapers: 0, totalPaid: 0, todayRegenerates: 0 })
    authApiMocks.getMyBalance.mockRejectedValue(new Error('余额加载失败'))

    mountPage(pinia)
    await nextTick()
    await flushPromises()

    expect(ElMessage.error).toHaveBeenCalledWith('余额加载失败')
  })

  it('shows admin menu item for admin user', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore()
    auth.user = { phone: '13800138000', role: 'admin' }
    authApiMocks.getUserStats.mockResolvedValue({ totalPapers: 0, totalPaid: 0, todayRegenerates: 0 })
    authApiMocks.getMyBalance.mockResolvedValue({ balance: 0 })

    const wrapper = mountPage(pinia)
    await nextTick()
    await flushPromises()

    expect(wrapper.text()).toContain('管理后台')
  })
})
