import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminOrdersPage from '@/pages/admin/orders/index.vue'

const adminApiMocks = vi.hoisted(() => ({
  getAdminOrders: vi.fn(),
  updatePrintStatus: vi.fn(),
}))

vi.mock('@/api/modules/admin', () => ({
  getAdminOrders: adminApiMocks.getAdminOrders,
  updatePrintStatus: adminApiMocks.updatePrintStatus,
}))

const mountPage = () =>
  mount(AdminOrdersPage, {
    global: {
      directives: {
        loading: {},
      },
      stubs: {
        'el-radio-group': { template: '<div><slot /></div>' },
        'el-radio-button': { template: '<button><slot /></button>' },
        'el-tabs': { template: '<div><slot /></div>' },
        'el-tab-pane': { template: '<div><slot /></div>' },
        'el-table': { template: '<div />' },
        'el-table-column': true,
        'el-tag': { template: '<span><slot /></span>' },
        'el-button': { template: '<button><slot /></button>' },
        'el-pagination': true,
      },
    },
  })

describe('Admin orders page', () => {
  beforeEach(() => {
    adminApiMocks.getAdminOrders.mockReset()
    adminApiMocks.updatePrintStatus.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('loads mine download orders on mount', async () => {
    adminApiMocks.getAdminOrders.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    })

    mountPage()
    await nextTick()

    expect(adminApiMocks.getAdminOrders).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      scope: 'mine',
      type: 'download',
    })
  })

  it('switches scope and refetches order list', async () => {
    adminApiMocks.getAdminOrders
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).switchScope('others')

    expect(adminApiMocks.getAdminOrders).toHaveBeenNthCalledWith(2, {
      page: 1,
      pageSize: 20,
      scope: 'others',
      type: 'download',
    })
  })

  it('updates print order status and refreshes list', async () => {
    adminApiMocks.getAdminOrders
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
    adminApiMocks.updatePrintStatus.mockResolvedValue({ ok: true })

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).updateStatus('order-1', 'printing')

    expect(adminApiMocks.updatePrintStatus).toHaveBeenCalledWith('order-1', 'printing')
    expect(ElMessage.success).toHaveBeenCalledWith('状态已更新')
    expect(adminApiMocks.getAdminOrders).toHaveBeenCalledTimes(2)
  })
})
