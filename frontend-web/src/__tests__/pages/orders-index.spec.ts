import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrderStore } from '@/stores/order'
import OrdersIndexPage from '@/pages/orders/index.vue'

const routerPush = vi.fn()
const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}))

vi.mock('@/api/index', () => ({
  default: apiMocks,
}))

const mountPage = (pinia = createPinia()) =>
  mount(OrdersIndexPage, {
    global: {
      plugins: [pinia],
      stubs: {
        'el-tabs': { template: '<div><slot /></div>' },
        'el-tab-pane': { template: '<div><slot /></div>' },
        'el-empty': { props: ['description'], template: '<div>{{ description }}<slot /></div>' },
        'el-button': { template: '<button><slot /></button>' },
        'el-tag': { template: '<span><slot /></span>' },
        'el-table': { template: '<div />' },
        'el-table-column': true,
      },
    },
  })

describe('Orders index page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    routerPush.mockReset()
    apiMocks.get.mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.error).mockReset()
    vi.stubGlobal('open', vi.fn())
  })

  it('loads download orders on mount', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    apiMocks.get.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    })

    const wrapper = mountPage(pinia)
    const orderStore = useOrderStore()
    await nextTick()

    expect(orderStore.activeTab).toBe('download')
    expect(apiMocks.get).toHaveBeenCalledWith('/orders', {
      params: { page: 1, pageSize: 20, type: 'download' },
    })
    expect(wrapper.text()).toContain('还没有下载订单')
  })

  it('switches tab and fetches print orders', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    apiMocks.get
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })

    const wrapper = mountPage(pinia)
    const orderStore = useOrderStore()
    await nextTick()

    await (wrapper.vm as any).switchTab('print')

    expect(orderStore.activeTab).toBe('print')
    expect(apiMocks.get).toHaveBeenNthCalledWith(2, '/orders', {
      params: { page: 1, pageSize: 20, type: 'print' },
    })
  })

  it('downloads paid order export file', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    apiMocks.get
      .mockResolvedValueOnce({
        list: [{ orderId: 'order-1', paperTitle: '数学卷', amount: 1200, status: 'paid', createdAt: '2026-06-21' }],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      })
      .mockResolvedValueOnce({ docxUrl: 'https://example.com/order-1.docx' })

    const wrapper = mountPage(pinia)
    await nextTick()

    await (wrapper.vm as any).handleDownload('order-1', { stopPropagation: vi.fn() })

    expect(apiMocks.get).toHaveBeenNthCalledWith(2, '/orders/order-1/download')
    expect(window.open).toHaveBeenCalledWith('https://example.com/order-1.docx', '_blank')
  })
})
