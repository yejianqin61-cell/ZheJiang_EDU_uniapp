import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ContributeDetailPage from '@/pages/contribute/detail/index.vue'

const routeState = vi.hoisted(() => ({
  params: { id: 'contribution-1' },
}))
const contributionApiMocks = vi.hoisted(() => ({
  getContribution: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
}))

vi.mock('@/api/modules/contribution', () => ({
  getContribution: contributionApiMocks.getContribution,
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
    contributionApiMocks.getContribution.mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('loads contribution detail on mount', async () => {
    contributionApiMocks.getContribution.mockResolvedValue({
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

    expect(contributionApiMocks.getContribution).toHaveBeenCalledWith('contribution-1')
    expect(wrapper.text()).toContain('数学题库.docx')
    expect(wrapper.text()).toContain('¥3.00')
  })
  it('shows error when loading contribution detail fails', async () => {
    contributionApiMocks.getContribution.mockRejectedValue(new Error('贡献详情服务异常'))

    mountPage()
    await nextTick()
    await nextTick()

    expect(ElMessage.error).toHaveBeenCalledWith('贡献详情服务异常')
  })
})
