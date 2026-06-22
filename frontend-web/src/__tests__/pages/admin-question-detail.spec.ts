import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminQuestionDetailPage from '@/pages/admin/questions/detail/index.vue'

type AdminQuestionDetailPageVm = {
  del: () => Promise<void>
}

const routerBack = vi.fn()
const routeState = vi.hoisted(() => ({
  params: { id: 'question-1' },
}))
const adminApiMocks = vi.hoisted(() => ({
  getQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    back: routerBack,
  }),
}))

vi.mock('@/api/modules/admin', () => ({
  getQuestion: adminApiMocks.getQuestion,
  deleteQuestion: adminApiMocks.deleteQuestion,
}))

vi.mock('@/composables/useMarkdown', () => ({
  renderMarkdown: (content: string) => content,
}))

const mountPage = () =>
  mount(AdminQuestionDetailPage, {
    global: {
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        'el-tag': { template: '<span><slot /></span>' },
        'el-button': { template: '<button><slot /></button>' },
      },
    },
  })

describe('Admin question detail page', () => {
  beforeEach(() => {
    routerBack.mockReset()
    adminApiMocks.getQuestion.mockReset()
    adminApiMocks.deleteQuestion.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  function getVm(wrapper: ReturnType<typeof mountPage>) {
    return wrapper.vm as AdminQuestionDetailPageVm
  }

  it('loads question detail on mount', async () => {
    adminApiMocks.getQuestion.mockResolvedValue({
      id: 'question-1',
      type: '选择题',
      difficulty: 2,
      subject: '数学',
      grade: '五年级',
      content: '题目内容',
      answer: 'B',
      analysis: null,
      options: null,
      sourceFile: { id: 'file-1', filename: 'sample.docx' },
      status: 'approved',
      isDeleted: false,
    })

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(adminApiMocks.getQuestion).toHaveBeenCalledWith('question-1')
    expect(wrapper.text()).toContain('题目内容')
    expect(wrapper.text()).toContain('sample.docx')
  })

  it('deletes question and returns to previous page', async () => {
    adminApiMocks.getQuestion.mockResolvedValue({
      id: 'question-1',
      type: '选择题',
      difficulty: 2,
      subject: '数学',
      grade: '五年级',
      content: '题目内容',
      answer: 'B',
      analysis: null,
      options: null,
      sourceFile: null,
      status: 'approved',
      isDeleted: false,
    })
    adminApiMocks.deleteQuestion.mockResolvedValue({ ok: true })

    const wrapper = mountPage()
    await nextTick()

    await getVm(wrapper).del()

    expect(adminApiMocks.deleteQuestion).toHaveBeenCalledWith('question-1')
    expect(ElMessage.success).toHaveBeenCalledWith('已删除')
    expect(routerBack).toHaveBeenCalled()
  })
  it('shows error when loading question detail fails', async () => {
    adminApiMocks.getQuestion.mockRejectedValue(new Error('题目详情服务异常'))

    mountPage()
    await nextTick()
    await nextTick()

    expect(ElMessage.error).toHaveBeenCalledWith('题目详情服务异常')
  })
})
