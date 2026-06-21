import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminOrdersPage from '@/pages/admin/orders/index.vue'

const routerPush = vi.fn()
const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
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
    routerPush.mockReset()
    apiMocks.get.mockReset()
    apiMocks.put.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('loads mine download orders on mount', async () => {
    apiMocks.get.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    })

    mountPage()
    await nextTick()

    expect(apiMocks.get).toHaveBeenCalledWith('/orders', {
      params: { page: 1, pageSize: 20, scope: 'mine', type: 'download' },
    })
  })

  it('switches scope and refetches order list', async () => {
    apiMocks.get
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).switchScope('others')

    expect(apiMocks.get).toHaveBeenNthCalledWith(2, '/orders', {
      params: { page: 1, pageSize: 20, scope: 'others', type: 'download' },
    })
  })

  it('updates print order status and refreshes list', async () => {
    apiMocks.get
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
    apiMocks.put.mockResolvedValue({ ok: true })

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).updateStatus('order-1', 'printing')

    expect(apiMocks.put).toHaveBeenCalledWith('/admin/orders/order-1/print-status', {
      printStatus: 'printing',
    })
    expect(ElMessage.success).toHaveBeenCalledWith('状态已更新')
    expect(apiMocks.get).toHaveBeenCalledTimes(2)
  })
})
