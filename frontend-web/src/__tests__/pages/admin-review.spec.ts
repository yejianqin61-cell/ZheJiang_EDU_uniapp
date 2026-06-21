import { mount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminReviewPage from '@/pages/admin/review/index.vue'

const routerPush = vi.fn()
const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}))

vi.mock('@/api/index', () => ({
  default: apiMocks,
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
    apiMocks.get.mockReset()
    apiMocks.post.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.error).mockReset()
    vi.mocked(ElMessageBox.confirm).mockReset()
  })

  it('loads review list on mount', async () => {
    apiMocks.get.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    })

    mountPage()
    await nextTick()

    expect(apiMocks.get).toHaveBeenCalledWith('/admin/reviews', {
      params: { page: 1, pageSize: 20 },
    })
  })

  it('warns when batch action is triggered without selection', async () => {
    apiMocks.get.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    })

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).batchAction('approve')

    expect(ElMessage.warning).toHaveBeenCalledWith('请先选择题目')
    expect(apiMocks.post).not.toHaveBeenCalled()
  })

  it('submits single approve action and refreshes list', async () => {
    apiMocks.get
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
    apiMocks.post.mockResolvedValue({ ok: true })

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).singleAction('review-1', 'approve')

    expect(apiMocks.post).toHaveBeenCalledWith('/admin/reviews/review-1/approve')
    expect(ElMessage.success).toHaveBeenCalledWith('操作成功')
    expect(apiMocks.get).toHaveBeenCalledTimes(2)
  })
})
