import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminKnowledgePage from '@/pages/admin/knowledge/index.vue'

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
  })

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

    ;(wrapper.vm as any).filters.subject = '数学'
    ;(wrapper.vm as any).filters.grade = '五年级'
    await (wrapper.vm as any).fetchList()

    expect(adminApiMocks.getKnowledgePoints).toHaveBeenNthCalledWith(2, {
      subject: '数学',
      grade: '五年级',
      page: 1,
      pageSize: 20,
    })
  })
})
