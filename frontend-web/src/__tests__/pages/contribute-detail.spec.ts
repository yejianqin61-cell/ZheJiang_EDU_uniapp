import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ContributeDetailPage from '@/pages/contribute/detail/index.vue'

const routeState = vi.hoisted(() => ({
  params: { id: 'contribution-1' },
}))
const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
}))

vi.mock('@/api/index', () => ({
  default: apiMocks,
}))

const mountPage = () =>
  mount(ContributeDetailPage, {
    global: {
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        'el-tag': { template: '<span><slot /></span>' },
      },
    },
  })

describe('Contribute detail page', () => {
  beforeEach(() => {
    apiMocks.get.mockReset()
  })

  it('loads contribution detail on mount', async () => {
    apiMocks.get.mockResolvedValue({
      filename: '数学题库.docx',
      subject: '数学',
      grade: '五年级',
      status: 'approved',
      questionCount: 12,
      reward: 300,
      createdAt: '2026-06-21',
    })

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(apiMocks.get).toHaveBeenCalledWith('/contributions/contribution-1')
    expect(wrapper.text()).toContain('数学题库.docx')
    expect(wrapper.text()).toContain('¥3.00')
  })
})
