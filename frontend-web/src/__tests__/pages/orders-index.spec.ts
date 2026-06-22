import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrderStore } from '@/stores/order'
import OrdersIndexPage from '@/pages/orders/index.vue'
import type { OrderItem } from '@/types'

const routerPush = vi.fn()
const orderApiMocks = vi.hoisted(() => ({
  getOrderDownload: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}))

vi.mock('@/api/modules/order', async () => {
  const actual = await vi.importActual<typeof import('@/api/modules/order')>('@/api/modules/order')
  return {
    ...actual,
    getOrderDownload: orderApiMocks.getOrderDownload,
  }
})

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

type OrdersIndexPageVm = {
  switchTab: (tab: 'download' | 'print' | 'exercise') => Promise<void> | void
  handleDownload: (orderId: string, event: Pick<Event, 'stopPropagation'>) => Promise<void>
}

function createOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    orderId: 'order-1',
    orderNo: 'NO001',
    paperTitle: '数学卷',
    amount: 1200,
    status: 'paid',
    createdAt: '2026-06-21',
    ...overrides,
  }
}

describe('Orders index page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    routerPush.mockReset()
    orderApiMocks.getOrderDownload.mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.error).mockReset()
    vi.stubGlobal('open', vi.fn())
  })

  it('loads download orders on mount', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const orderStore = useOrderStore()
    vi.spyOn(orderStore, 'fetchOrders').mockResolvedValue()

    const wrapper = mountPage(pinia)
    await nextTick()

    expect(orderStore.activeTab).toBe('download')
    expect(orderStore.fetchOrders).toHaveBeenCalledWith(1, 'download')
    expect(wrapper.text()).toContain('还没有下载订单，去组一份试卷吧')
  })

  it('switches tab and fetches print orders', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const orderStore = useOrderStore()
    vi.spyOn(orderStore, 'fetchOrders').mockResolvedValue()

    const wrapper = mountPage(pinia)
    await nextTick()

    await (wrapper.vm as OrdersIndexPageVm).switchTab('print')

    expect(orderStore.activeTab).toBe('print')
    expect(orderStore.fetchOrders).toHaveBeenNthCalledWith(2, 1, 'print')
  })

  it('downloads paid order export file', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const orderStore = useOrderStore()
    orderStore.orders = [createOrderItem()]
    vi.spyOn(orderStore, 'fetchOrders').mockResolvedValue()
    orderApiMocks.getOrderDownload.mockResolvedValue({ docxUrl: 'https://example.com/order-1.docx' })

    const wrapper = mountPage(pinia)
    await nextTick()

    await (wrapper.vm as OrdersIndexPageVm).handleDownload('order-1', { stopPropagation: vi.fn() })

    expect(orderApiMocks.getOrderDownload).toHaveBeenCalledWith('order-1')
    expect(window.open).toHaveBeenCalledWith('https://example.com/order-1.docx', '_blank')
  })

  it('shows fallback error when download request fails without message', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const orderStore = useOrderStore()
    orderStore.orders = [createOrderItem()]
    vi.spyOn(orderStore, 'fetchOrders').mockResolvedValue()
    orderApiMocks.getOrderDownload.mockRejectedValue({ code: 500 })

    const wrapper = mountPage(pinia)
    await nextTick()

    await (wrapper.vm as OrdersIndexPageVm).handleDownload('order-1', { stopPropagation: vi.fn() })

    expect(ElMessage.error).toHaveBeenCalledWith('获取下载链接失败')
  })
})
