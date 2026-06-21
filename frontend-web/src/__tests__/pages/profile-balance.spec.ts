import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfileBalancePage from '@/pages/profile/balance/index.vue'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('@/api/index', () => ({
  default: apiMocks,
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
    apiMocks.get.mockReset()
  })

  it('loads user balance on mount', async () => {
    apiMocks.get.mockResolvedValue({ balance: 12345 })

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(apiMocks.get).toHaveBeenCalledWith('/users/me/balance')
    expect(wrapper.text()).toContain('¥123.45')
  })
})
