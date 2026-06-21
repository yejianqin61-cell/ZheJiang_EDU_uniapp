import { mount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminQuestionsPage from '@/pages/admin/questions/index.vue'
import { elInputStub } from '@/__tests__/utils/element-plus-stubs'

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
    vi.mocked(ElMessageBox.confirm).mockReset()
  })

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

    ;(wrapper.vm as any).filters.subject = '数学'
    ;(wrapper.vm as any).filters.keyword = '方程'
    await (wrapper.vm as any).reset()

    expect((wrapper.vm as any).filters).toEqual({
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
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm' as any)

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).del('q-1')

    expect(adminApiMocks.deleteQuestion).toHaveBeenCalledWith('q-1')
    expect(ElMessage.success).toHaveBeenCalledWith('已删除')
    expect(adminApiMocks.getQuestions).toHaveBeenCalledTimes(2)
  })
})
