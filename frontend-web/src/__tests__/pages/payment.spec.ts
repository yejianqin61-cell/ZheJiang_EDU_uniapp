import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ElMessage } from 'element-plus'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrderStore } from '@/stores/order'
import PaymentPage from '@/pages/payment/index.vue'

const routerBack = vi.fn()
const routerReplace = vi.fn()
const routeState = vi.hoisted(() => ({
  query: {
    paperId: 'paper-1' as string | undefined,
    type: 'download',
  },
}))
const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    back: routerBack,
    replace: routerReplace,
  }),
}))

vi.mock('@/api/index', () => ({
  default: apiMocks,
}))

const mountPage = () =>
  mount(PaymentPage, {
    global: {
      plugins: [createPinia()],
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        'el-button': { template: '<button><slot /></button>' },
        'el-tag': { template: '<span><slot /></span>' },
      },
    },
  })

describe('Payment page', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    routeState.query.paperId = 'paper-1'
    routeState.query.type = 'download'
    routerBack.mockReset()
    routerReplace.mockReset()
    apiMocks.get.mockReset()
    apiMocks.post.mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('creates order on mount when paper id exists and current order is empty', async () => {
    apiMocks.get.mockResolvedValue({ balance: 5000 })
    apiMocks.post.mockResolvedValueOnce({
      orderId: 'order-1',
      orderNo: 'NO001',
      amount: 1200,
      type: 'download',
    })

    const wrapper = mountPage()
    const orderStore = useOrderStore()
    await Promise.resolve()
    await Promise.resolve()

    expect(apiMocks.post).toHaveBeenCalledWith('/orders', {
      paperId: 'paper-1',
      type: 'download',
      copies: undefined,
      shippingAddressId: undefined,
    })
    expect(orderStore.currentOrder?.orderId).toBe('order-1')
    expect((wrapper.vm as any).canBalancePay).toBe(true)
  })

  it('redirects to paper config when both paper id and current order are missing', async () => {
    routeState.query.paperId = undefined
    apiMocks.get.mockResolvedValue({ balance: 0 })

    mountPage()
    await Promise.resolve()
    await Promise.resolve()
    await vi.runAllTimersAsync()

    expect(ElMessage.warning).toHaveBeenCalledWith('订单信息丢失，请重新组卷')
    expect(routerReplace).toHaveBeenCalledWith('/paper/config')
  })

  it('submits balance payment and navigates to order detail', async () => {
    apiMocks.get.mockResolvedValue({ balance: 5000 })
    apiMocks.post.mockResolvedValue({ ok: true })

    const wrapper = mountPage()
    const orderStore = useOrderStore()
    orderStore.currentOrder = {
      orderId: 'order-9',
      orderNo: 'NO009',
      amount: 1200,
      type: 'download',
    }
    await Promise.resolve()

    await (wrapper.vm as any).handleBalancePay()
    await vi.runAllTimersAsync()

    expect(apiMocks.post).toHaveBeenCalledWith('/orders/order-9/balance-pay')
    expect(ElMessage.success).toHaveBeenCalledWith('支付成功')
    expect(routerReplace).toHaveBeenCalledWith('/orders/order-9')
  })
})
