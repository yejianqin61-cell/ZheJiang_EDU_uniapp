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

  it('loads balance summary on mount', async () => {
    authApiMocks.getMyBalance.mockResolvedValue({
      balance: 12345,
      totalEarned: 23456,
      totalSpent: 11111,
    })

    const wrapper = mountPage()
    await nextTick()
    await flushPromises()

    expect(authApiMocks.getMyBalance).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('123.45')
    expect(wrapper.text()).toContain('234.56')
    expect(wrapper.text()).toContain('111.11')
  })
})
