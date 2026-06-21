import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminReviewDetailPage from '@/pages/admin/review/detail/index.vue'

const routerBack = vi.fn()
const routeState = vi.hoisted(() => ({
  params: { id: 'review-1' },
}))
const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    back: routerBack,
  }),
}))

vi.mock('@/api/index', () => ({
  default: apiMocks,
}))

vi.mock('@/composables/useMarkdown', () => ({
  renderMarkdown: (content: string) => content,
}))

const mountPage = () =>
  mount(AdminReviewDetailPage, {
    global: {
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        'el-tag': { template: '<span><slot /></span>' },
        'el-button': { template: '<button><slot /></button>' },
      },
    },
  })

describe('Admin review detail page', () => {
  beforeEach(() => {
    routerBack.mockReset()
    apiMocks.get.mockReset()
    apiMocks.post.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('loads review detail on mount', async () => {
    apiMocks.get.mockResolvedValue({
      type: '选择题',
      difficulty: '2',
      content: '题目内容',
      subject: '数学',
      grade: '五年级',
      answer: 'B',
      knowledgePoint: { name: '加减法' },
    })

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(apiMocks.get).toHaveBeenCalledWith('/admin/reviews/review-1')
    expect(wrapper.text()).toContain('题目内容')
  })

  it('approves review item and returns to previous page', async () => {
    apiMocks.get.mockResolvedValue({ content: '题目内容' })
    apiMocks.post.mockResolvedValue({ ok: true })

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).approve()

    expect(apiMocks.post).toHaveBeenCalledWith('/admin/reviews/review-1/approve')
    expect(ElMessage.success).toHaveBeenCalledWith('已通过')
    expect(routerBack).toHaveBeenCalled()
  })

  it('rejects review item and returns to previous page', async () => {
    apiMocks.get.mockResolvedValue({ content: '题目内容' })
    apiMocks.post.mockResolvedValue({ ok: true })

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).reject()

    expect(apiMocks.post).toHaveBeenCalledWith('/admin/reviews/review-1/reject')
    expect(ElMessage.success).toHaveBeenCalledWith('已拒绝')
    expect(routerBack).toHaveBeenCalled()
  })
})
