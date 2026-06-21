import { mount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminReviewPage from '@/pages/admin/review/index.vue'

const routerPush = vi.fn()
const adminApiMocks = vi.hoisted(() => ({
  getReviewList: vi.fn(),
  batchReview: vi.fn(),
  approveQuestion: vi.fn(),
  rejectQuestion: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}))

vi.mock('@/api/modules/admin', () => ({
  getReviewList: adminApiMocks.getReviewList,
  batchReview: adminApiMocks.batchReview,
  approveQuestion: adminApiMocks.approveQuestion,
  rejectQuestion: adminApiMocks.rejectQuestion,
}))

const mountPage = () =>
  mount(AdminReviewPage, {
    global: {
      directives: {
        loading: {},
      },
      stubs: {
        'el-button': { template: '<button><slot /></button>' },
        'el-table': { template: '<div />' },
        'el-table-column': true,
        'el-tag': { template: '<span><slot /></span>' },
        'el-pagination': true,
      },
    },
  })

describe('Admin review page', () => {
  beforeEach(() => {
    routerPush.mockReset()
    adminApiMocks.getReviewList.mockReset()
    adminApiMocks.batchReview.mockReset()
    adminApiMocks.approveQuestion.mockReset()
    adminApiMocks.rejectQuestion.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.error).mockReset()
    vi.mocked(ElMessageBox.confirm).mockReset()
  })

  it('loads review list on mount', async () => {
    adminApiMocks.getReviewList.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    })

    mountPage()
    await nextTick()

    expect(adminApiMocks.getReviewList).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
    })
  })

  it('warns when batch action is triggered without selection', async () => {
    adminApiMocks.getReviewList.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    })

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).batchAction('approve')

    expect(ElMessage.warning).toHaveBeenCalledWith('请先选择题目')
    expect(adminApiMocks.batchReview).not.toHaveBeenCalled()
  })

  it('submits single approve action and refreshes list', async () => {
    adminApiMocks.getReviewList
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
    adminApiMocks.approveQuestion.mockResolvedValue({ ok: true })

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).singleAction('review-1', 'approve')

    expect(adminApiMocks.approveQuestion).toHaveBeenCalledWith('review-1')
    expect(ElMessage.success).toHaveBeenCalledWith('操作成功')
    expect(adminApiMocks.getReviewList).toHaveBeenCalledTimes(2)
  })
})
