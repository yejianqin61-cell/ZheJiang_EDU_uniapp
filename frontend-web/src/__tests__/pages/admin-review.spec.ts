import { mount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminReviewPage from '@/pages/admin/review/index.vue'
import type { Pagination, ReviewListItem } from '@/types'

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

type AdminReviewPageVm = {
  selected: string[]
  batchAction: (action: 'approve' | 'reject') => Promise<void>
  singleAction: (id: string, action: 'approve' | 'reject') => Promise<void>
}

function createPagination(overrides: Partial<Pagination> = {}): Pagination {
  return {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    ...overrides,
  }
}

function createReviewItem(overrides: Partial<ReviewListItem> = {}): ReviewListItem {
  return {
    id: 'review-1',
    type: '单选题',
    content: '题目内容',
    options: ['A', 'B'],
    answer: 'A',
    analysis: '解析',
    difficulty: 2,
    subject: '数学',
    grade: '五年级',
    status: 'pending',
    source: {
      type: 'teacher',
      userName: '张老师',
      userId: 'teacher-1',
      fileName: 'demo.docx',
      fileId: 'file-1',
    },
    knowledgePoints: ['计算'],
    ...overrides,
  }
}

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
      pagination: createPagination(),
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
      pagination: createPagination(),
    })

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as AdminReviewPageVm).batchAction('approve')

    expect(ElMessage.warning).toHaveBeenCalledWith('请先选择题目')
    expect(adminApiMocks.batchReview).not.toHaveBeenCalled()
  })

  it('submits single approve action and refreshes list', async () => {
    adminApiMocks.getReviewList
      .mockResolvedValueOnce({ list: [], pagination: createPagination() })
      .mockResolvedValueOnce({ list: [], pagination: createPagination() })
    adminApiMocks.approveQuestion.mockResolvedValue({ ok: true })

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as AdminReviewPageVm).singleAction('review-1', 'approve')

    expect(adminApiMocks.approveQuestion).toHaveBeenCalledWith('review-1')
    expect(ElMessage.success).toHaveBeenCalledWith('操作成功')
    expect(adminApiMocks.getReviewList).toHaveBeenCalledTimes(2)
  })

  it('does not show error when batch confirmation is canceled', async () => {
    adminApiMocks.getReviewList.mockResolvedValue({
      list: [createReviewItem()],
      pagination: createPagination({ total: 1 }),
    })
    vi.mocked(ElMessageBox.confirm).mockRejectedValue('cancel')

    const wrapper = mountPage()
    await nextTick()

    ;(wrapper.vm as AdminReviewPageVm).selected = ['review-1']
    await (wrapper.vm as AdminReviewPageVm).batchAction('approve')

    expect(adminApiMocks.batchReview).not.toHaveBeenCalled()
    expect(ElMessage.error).not.toHaveBeenCalled()
  })

  it('shows error when batch review fails', async () => {
    adminApiMocks.getReviewList.mockResolvedValue({
      list: [createReviewItem()],
      pagination: createPagination({ total: 1 }),
    })
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm')
    adminApiMocks.batchReview.mockRejectedValue(new Error('批量审核失败'))

    const wrapper = mountPage()
    await nextTick()

    ;(wrapper.vm as AdminReviewPageVm).selected = ['review-1']
    await (wrapper.vm as AdminReviewPageVm).batchAction('approve')

    expect(adminApiMocks.batchReview).toHaveBeenCalledWith(['review-1'], 'approve')
    expect(ElMessage.error).toHaveBeenCalledWith('批量审核失败')
  })
})
