import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminKnowledgePage from '@/pages/admin/knowledge/index.vue'

type AdminKnowledgePageVm = {
  filters: {
    subject: string
    grade: string
  }
  fetchList: () => Promise<void>
}

const adminApiMocks = vi.hoisted(() => ({
  getKnowledgePoints: vi.fn(),
}))

vi.mock('@/api/modules/admin', () => ({
  getKnowledgePoints: adminApiMocks.getKnowledgePoints,
}))

const mountPage = () =>
  mount(AdminKnowledgePage, {
    global: {
      directives: {
        loading: {},
      },
      stubs: {
        'el-select': { template: '<div><slot /></div>' },
        'el-option': true,
        'el-button': { template: '<button><slot /></button>' },
        'el-table': { template: '<div />' },
        'el-table-column': true,
        'el-pagination': true,
      },
    },
  })

describe('Admin knowledge page', () => {
  beforeEach(() => {
    adminApiMocks.getKnowledgePoints.mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  function getVm(wrapper: ReturnType<typeof mountPage>) {
    return wrapper.vm as AdminKnowledgePageVm
  }

  it('loads knowledge point list on mount', async () => {
    adminApiMocks.getKnowledgePoints.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    })

    const wrapper = mountPage()
    await nextTick()

    expect(adminApiMocks.getKnowledgePoints).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
    })
    expect(wrapper.text()).toContain('共 0 个知识点')
  })

  it('fetches filtered knowledge points', async () => {
    adminApiMocks.getKnowledgePoints
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 } })

    const wrapper = mountPage()
    await nextTick()

    getVm(wrapper).filters.subject = '数学'
    getVm(wrapper).filters.grade = '五年级'
    await getVm(wrapper).fetchList()

    expect(adminApiMocks.getKnowledgePoints).toHaveBeenNthCalledWith(2, {
      subject: '数学',
      grade: '五年级',
      page: 1,
      pageSize: 20,
    })
  })
  it('shows error when loading knowledge points fails', async () => {
    adminApiMocks.getKnowledgePoints.mockRejectedValue(new Error('知识点服务异常'))

    mountPage()
    await nextTick()

    expect(ElMessage.error).toHaveBeenCalledWith('知识点服务异常')
  })
})
