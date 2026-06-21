import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminKnowledgePage from '@/pages/admin/knowledge/index.vue'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('@/api/index', () => ({
  default: apiMocks,
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
    apiMocks.get.mockReset()
  })

  it('loads knowledge point list on mount', async () => {
    apiMocks.get.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    })

    const wrapper = mountPage()
    await nextTick()

    expect(apiMocks.get).toHaveBeenCalledWith('/admin/knowledge-points', {
      params: { page: 1, pageSize: 20 },
    })
    expect(wrapper.text()).toContain('共 0 个知识点')
  })

  it('fetches filtered knowledge points', async () => {
    apiMocks.get
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 } })

    const wrapper = mountPage()
    await nextTick()

    ;(wrapper.vm as any).filters.subject = '数学'
    ;(wrapper.vm as any).filters.grade = '五年级'
    await (wrapper.vm as any).fetchList()

    expect(apiMocks.get).toHaveBeenNthCalledWith(2, '/admin/knowledge-points', {
      params: { subject: '数学', grade: '五年级', page: 1, pageSize: 20 },
    })
  })
})
