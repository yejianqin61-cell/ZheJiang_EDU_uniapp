import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ContributePreviewPage from '@/pages/contribute/preview/index.vue'

type ContributePreviewPageVm = {
  submit: () => Promise<void>
}

const routerReplace = vi.fn()
const routeState = vi.hoisted(() => ({
  query: { id: 'contribution-1' },
}))
const contributionApiMocks = vi.hoisted(() => ({
  getContributionQuestions: vi.fn(),
  submitContribution: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    replace: routerReplace,
  }),
}))

vi.mock('@/api/modules/contribution', () => ({
  getContributionQuestions: contributionApiMocks.getContributionQuestions,
  submitContribution: contributionApiMocks.submitContribution,
}))

vi.mock('@/composables/useMarkdown', () => ({
  renderMarkdown: (content: string) => content,
}))

const mountPage = () =>
  mount(ContributePreviewPage, {
    global: {
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        'el-tag': { template: '<span><slot /></span>' },
        'el-button': { template: '<button><slot /></button>' },
      },
    },
  })

describe('Contribute preview page', () => {
  beforeEach(() => {
    routerReplace.mockReset()
    contributionApiMocks.getContributionQuestions.mockReset()
    contributionApiMocks.submitContribution.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  function getVm(wrapper: ReturnType<typeof mountPage>) {
    return wrapper.vm as ContributePreviewPageVm
  }

  it('loads parsed questions on mount', async () => {
    contributionApiMocks.getContributionQuestions.mockResolvedValue([
      { type: '选择题', content: '1 + 1 = ?', options: ['1', '2'] },
    ])

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(contributionApiMocks.getContributionQuestions).toHaveBeenCalledWith('contribution-1')
    expect(wrapper.text()).toContain('1 + 1 = ?')
  })

  it('submits contribution for review and returns to contribute list', async () => {
    contributionApiMocks.getContributionQuestions.mockResolvedValue([])
    contributionApiMocks.submitContribution.mockResolvedValue({ ok: true })

    const wrapper = mountPage()
    await nextTick()

    await getVm(wrapper).submit()

    expect(contributionApiMocks.submitContribution).toHaveBeenCalledWith('contribution-1')
    expect(ElMessage.success).toHaveBeenCalledWith('已提交审核')
    expect(routerReplace).toHaveBeenCalledWith('/contribute')
  })

  it('shows error when submit request fails', async () => {
    contributionApiMocks.getContributionQuestions.mockResolvedValue([])
    contributionApiMocks.submitContribution.mockRejectedValue(new Error('提交服务异常'))

    const wrapper = mountPage()
    await nextTick()

    await getVm(wrapper).submit()

    expect(ElMessage.error).toHaveBeenCalledWith('提交服务异常')
  })
  it('shows error when loading preview questions fails', async () => {
    contributionApiMocks.getContributionQuestions.mockRejectedValue(new Error('题库预览服务异常'))

    mountPage()
    await nextTick()
    await nextTick()

    expect(ElMessage.error).toHaveBeenCalledWith('题库预览服务异常')
  })
})
