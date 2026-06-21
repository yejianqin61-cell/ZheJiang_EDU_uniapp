import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth'
import ProfileIndexPage from '@/pages/profile/index.vue'

const routerPush = vi.fn()
const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}))

vi.mock('@/api/index', () => ({
  default: apiMocks,
}))

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
    apiMocks.get.mockReset()
    localStorage.clear()
  })

  it('loads user stats and balance on mount', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore()
    auth.user = { phone: '13800138000', role: 'teacher' }
    apiMocks.get
      .mockResolvedValueOnce({ orderCount: 5, contributionCount: 2, balance: 300 })
      .mockResolvedValueOnce({ balance: 1200 })

    const wrapper = mountPage(pinia)
    await nextTick()
    await nextTick()

    expect(apiMocks.get).toHaveBeenNthCalledWith(1, '/users/me/stats')
    expect(apiMocks.get).toHaveBeenNthCalledWith(2, '/users/me/balance')
    expect(wrapper.text()).toContain('138****8000')
    expect(wrapper.text()).toContain('历史订单')
  })

  it('shows admin menu item for admin user', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore()
    auth.user = { phone: '13800138000', role: 'admin' }
    apiMocks.get.mockResolvedValue({ balance: 0, orderCount: 0, contributionCount: 0 })

    const wrapper = mountPage(pinia)
    await nextTick()

    expect(wrapper.text()).toContain('管理后台')
  })
})
