import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import TopNav from '@/components/TopNav.vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useRoute: () => ({ path: '/', query: {}, params: {}, fullPath: '/' }),
  RouterLink: { template: '<a><slot/></a>' },
}))

describe('TopNav', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('未登录时显示登录按钮', () => {
    const wrapper = mount(TopNav, {
      global: { stubs: { 'el-button': { template: '<button><slot/></button>' }, 'el-dropdown': true, 'el-icon': true, 'el-dropdown-menu': true, 'el-dropdown-item': true, 'router-link': { template: '<a><slot/></a>' }, UserFilled: true, ArrowDown: true } },
    })
    expect(wrapper.text()).toContain('瓯越AI组题网')
    expect(wrapper.text()).toContain('登录')
  })

  it('管理员登录后显示完整菜单', () => {
    const auth = useAuthStore()
    auth.user = { phone: '13800138000', role: 'admin' }
    auth.token = 'test-token'
    const wrapper = mount(TopNav, {
      global: { stubs: { 'el-button': { template: '<button><slot/></button>' }, 'el-dropdown': true, 'el-icon': true, 'el-dropdown-menu': true, 'el-dropdown-item': true, 'router-link': { template: '<a><slot/></a>' }, UserFilled: true, ArrowDown: true } },
    })
    expect(wrapper.text()).toContain('瓯越AI组题网')
    expect(wrapper.text()).toContain('管理后台')
  })
})
