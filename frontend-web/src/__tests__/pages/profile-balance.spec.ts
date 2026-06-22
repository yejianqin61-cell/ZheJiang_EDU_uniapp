import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfileBalancePage from '@/pages/profile/balance/index.vue'

const authApiMocks = vi.hoisted(() => ({
  getMyBalance: vi.fn(),
}))

vi.mock('@/api/modules/auth', () => ({
  getMyBalance: authApiMocks.getMyBalance,
}))

const mountPage = () =>
  mount(ProfileBalancePage, {
    global: {
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
      },
    },
  })

describe('Profile balance page', () => {
  beforeEach(() => {
    authApiMocks.getMyBalance.mockReset()
  })

  it('loads user balance on mount', async () => {
    authApiMocks.getMyBalance.mockResolvedValue({ balance: 12345 })

    const wrapper = mountPage()
    await nextTick()
    await flushPromises()

    expect(authApiMocks.getMyBalance).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('¥123.45')
  })
})
