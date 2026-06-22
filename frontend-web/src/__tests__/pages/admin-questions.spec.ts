import { mount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminQuestionsPage from '@/pages/admin/questions/index.vue'
import { elInputStub } from '@/__tests__/utils/element-plus-stubs'

type AdminQuestionsPageVm = {
  filters: {
    subject: string
    grade: string
    knowledgePoint: string
    difficulty: string
    keyword: string
  }
  reset: () => Promise<void> | void
  del: (id: string) => Promise<void>
}

const routerPush = vi.fn()
const adminApiMocks = vi.hoisted(() => ({
  getQuestions: vi.fn(),
  deleteQuestion: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}))

vi.mock('@/api/modules/admin', () => ({
  getQuestions: adminApiMocks.getQuestions,
  deleteQuestion: adminApiMocks.deleteQuestion,
}))

const mountPage = () =>
  mount(AdminQuestionsPage, {
    global: {
      directives: {
        loading: {},
      },
      stubs: {
        'el-select': { template: '<div><slot /></div>' },
        'el-option': true,
        'el-input': elInputStub,
        'el-button': { template: '<button><slot /></button>' },
        'el-table': { template: '<div />' },
        'el-table-column': true,
        'el-tag': { template: '<span><slot /></span>' },
        'el-pagination': true,
      },
    },
  })

describe('Admin questions page', () => {
  beforeEach(() => {
    routerPush.mockReset()
    adminApiMocks.getQuestions.mockReset()
    adminApiMocks.deleteQuestion.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
    vi.mocked(ElMessageBox.confirm).mockReset()
  })

  function getVm(wrapper: ReturnType<typeof mountPage>) {
    return wrapper.vm as AdminQuestionsPageVm
  }

  it('loads question list on mount', async () => {
    adminApiMocks.getQuestions.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    })

    const wrapper = mountPage()
    await nextTick()

    expect(adminApiMocks.getQuestions).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
    expect(wrapper.text()).toContain('共 0 题')
  })

  it('resets filters and refetches list', async () => {
    adminApiMocks.getQuestions
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })

    const wrapper = mountPage()
    await nextTick()

    getVm(wrapper).filters.subject = '数学'
    getVm(wrapper).filters.keyword = '方程'
    await getVm(wrapper).reset()

    expect(getVm(wrapper).filters).toEqual({
      subject: '',
      grade: '',
      knowledgePoint: '',
      difficulty: '',
      keyword: '',
    })
    expect(adminApiMocks.getQuestions).toHaveBeenCalledTimes(2)
  })

  it('deletes question and refreshes list after confirmation', async () => {
    adminApiMocks.getQuestions
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
    adminApiMocks.deleteQuestion.mockResolvedValue({ ok: true })
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm')

    const wrapper = mountPage()
    await nextTick()

    await getVm(wrapper).del('q-1')

    expect(adminApiMocks.deleteQuestion).toHaveBeenCalledWith('q-1')
    expect(ElMessage.success).toHaveBeenCalledWith('已删除')
    expect(adminApiMocks.getQuestions).toHaveBeenCalledTimes(2)
  })
  it('shows error when loading question list fails', async () => {
    adminApiMocks.getQuestions.mockRejectedValue(new Error('题库列表服务异常'))

    mountPage()
    await nextTick()

    expect(ElMessage.error).toHaveBeenCalledWith('题库列表服务异常')
  })

  it('shows error when deleting question fails', async () => {
    adminApiMocks.getQuestions.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    })
    adminApiMocks.deleteQuestion.mockRejectedValue(new Error('删除题目服务异常'))
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm')

    const wrapper = mountPage()
    await nextTick()

    await getVm(wrapper).del('q-1')

    expect(ElMessage.error).toHaveBeenCalledWith('删除题目服务异常')
  })
})
