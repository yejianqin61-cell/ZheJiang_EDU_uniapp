import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminReviewDetailPage from '@/pages/admin/review/detail/index.vue'

const routerBack = vi.fn()
const routeState = vi.hoisted(() => ({
  params: { id: 'review-1' },
}))
const adminApiMocks = vi.hoisted(() => ({
  getReviewDetail: vi.fn(),
  approveQuestion: vi.fn(),
  rejectQuestion: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    back: routerBack,
  }),
}))

vi.mock('@/api/modules/admin', () => ({
  getReviewDetail: adminApiMocks.getReviewDetail,
  approveQuestion: adminApiMocks.approveQuestion,
  rejectQuestion: adminApiMocks.rejectQuestion,
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

function mockReviewDetail() {
  adminApiMocks.getReviewDetail.mockResolvedValue({
    id: 'review-1',
    type: '选择题',
    difficulty: 2,
    content: '题目内容',
    subject: '数学',
    grade: '五年级',
    answer: 'A',
    status: 'pending_review',
    source: { type: 'teacher', userName: '张老师', userId: 'u-1', fileName: 'a.docx', fileId: 'f-1' },
    knowledgePoints: ['加减法', '应用题'],
    options: ['A', 'B'],
    analysis: '解析内容',
  })
}

describe('Admin review detail page', () => {
  beforeEach(() => {
    routerBack.mockReset()
    adminApiMocks.getReviewDetail.mockReset()
    adminApiMocks.approveQuestion.mockReset()
    adminApiMocks.rejectQuestion.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('loads review detail on mount and renders knowledge points list', async () => {
    mockReviewDetail()

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(adminApiMocks.getReviewDetail).toHaveBeenCalledWith('review-1')
    expect(wrapper.text()).toContain('题目内容')
    expect(wrapper.text()).toContain('加减法 / 应用题')
  })

  it('approves review item and returns to previous page', async () => {
    mockReviewDetail()
    adminApiMocks.approveQuestion.mockResolvedValue({ ok: true })

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).approve()

    expect(adminApiMocks.approveQuestion).toHaveBeenCalledWith('review-1')
    expect(ElMessage.success).toHaveBeenCalledWith('已通过')
    expect(routerBack).toHaveBeenCalled()
  })

  it('rejects review item and returns to previous page', async () => {
    mockReviewDetail()
    adminApiMocks.rejectQuestion.mockResolvedValue({ ok: true })

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).reject()

    expect(adminApiMocks.rejectQuestion).toHaveBeenCalledWith('review-1')
    expect(ElMessage.success).toHaveBeenCalledWith('已拒绝')
    expect(routerBack).toHaveBeenCalled()
  })
})
