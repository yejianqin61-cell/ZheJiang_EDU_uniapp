import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ContributePreviewPage from '@/pages/contribute/preview/index.vue'

const routerReplace = vi.fn()
const routeState = vi.hoisted(() => ({
  query: { id: 'contribution-1' },
}))
const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    replace: routerReplace,
  }),
}))

vi.mock('@/api/index', () => ({
  default: apiMocks,
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
    apiMocks.get.mockReset()
    apiMocks.post.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('loads parsed questions on mount', async () => {
    apiMocks.get.mockResolvedValue({
      questions: [{ type: '选择题', content: '1 + 1 = ?', options: ['1', '2'] }],
    })

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(apiMocks.get).toHaveBeenCalledWith('/contributions/contribution-1')
    expect(wrapper.text()).toContain('1 + 1 = ?')
  })

  it('submits contribution for review and returns to contribute list', async () => {
    apiMocks.get.mockResolvedValue({ questions: [] })
    apiMocks.post.mockResolvedValue({ ok: true })

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).submit()

    expect(apiMocks.post).toHaveBeenCalledWith('/contributions/contribution-1/submit')
    expect(ElMessage.success).toHaveBeenCalledWith('已提交审核')
    expect(routerReplace).toHaveBeenCalledWith('/contribute')
  })
})
