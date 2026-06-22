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
const authApiMocks = vi.hoisted(() => ({
  getMyBalance: vi.fn(),
  payByBalance: vi.fn(),
}))
const paymentApiMocks = vi.hoisted(() => ({
  payAlipay: vi.fn(),
  payMock: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    back: routerBack,
    replace: routerReplace,
  }),
}))

vi.mock('@/api/modules/auth', () => ({
  getMyBalance: authApiMocks.getMyBalance,
  payByBalance: authApiMocks.payByBalance,
}))

vi.mock('@/api/modules/payment', () => ({
  payAlipay: paymentApiMocks.payAlipay,
  payMock: paymentApiMocks.payMock,
}))

const mountPage = (pinia = createPinia()) =>
  mount(PaymentPage, {
    global: {
      plugins: [pinia],
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
    authApiMocks.getMyBalance.mockReset()
    authApiMocks.payByBalance.mockReset()
    paymentApiMocks.payAlipay.mockReset()
    paymentApiMocks.payMock.mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('creates order on mount when paper id exists and current order is empty', async () => {
    authApiMocks.getMyBalance.mockResolvedValue({ balance: 5000 })
    const pinia = createPinia()
    setActivePinia(pinia)
    const orderStore = useOrderStore()
    const createSpy = vi.spyOn(orderStore, 'create').mockImplementation(async () => {
      const result = {
        orderId: 'order-1',
        orderNo: 'NO001',
        amount: 1200,
        type: 'download',
      } as any
      orderStore.currentOrder = result
      return result
    })

    const wrapper = mountPage(pinia)
    await Promise.resolve()
    await Promise.resolve()

    expect(createSpy).toHaveBeenCalledWith('paper-1', 'download')
    expect((wrapper.vm as any).canBalancePay).toBe(true)
  })

  it('redirects to paper config when both paper id and current order are missing', async () => {
    routeState.query.paperId = undefined
    authApiMocks.getMyBalance.mockResolvedValue({ balance: 0 })

    mountPage()
    await Promise.resolve()
    await Promise.resolve()
    await vi.runAllTimersAsync()

    expect(ElMessage.warning).toHaveBeenCalledWith('订单信息丢失，请重新组卷')
    expect(routerReplace).toHaveBeenCalledWith('/paper/config')
  })

  it('submits balance payment and navigates to order detail', async () => {
    authApiMocks.getMyBalance.mockResolvedValue({ balance: 5000 })
    authApiMocks.payByBalance.mockResolvedValue(undefined)

    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mountPage(pinia)
    const orderStore = useOrderStore()
    orderStore.currentOrder = {
      orderId: 'order-9',
      orderNo: 'NO009',
      amount: 1200,
      type: 'download',
    } as any
    await Promise.resolve()

    await (wrapper.vm as any).handleBalancePay()
    await vi.runAllTimersAsync()

    expect(authApiMocks.payByBalance).toHaveBeenCalledWith('order-9')
    expect(ElMessage.success).toHaveBeenCalledWith('支付成功')
    expect(routerReplace).toHaveBeenCalledWith('/orders/order-9')
  })
  it('requests alipay payForm when current order payment payload is missing', async () => {
    authApiMocks.getMyBalance.mockResolvedValue({ balance: 5000 })
    paymentApiMocks.payAlipay.mockResolvedValue({ paymentId: 'pay-2', payForm: '<form id="alipay-form"></form>' })

    const appendChild = vi.spyOn(document.body, 'appendChild')
    const submit = vi.fn()
    const querySelector = vi.spyOn(HTMLDivElement.prototype, 'querySelector').mockReturnValue({ submit } as any)

    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mountPage(pinia)
    const orderStore = useOrderStore()
    orderStore.currentOrder = {
      orderId: 'order-10',
      orderNo: 'NO010',
      amount: 1600,
      type: 'download',
      payment: null,
    } as any
    await Promise.resolve()

    await (wrapper.vm as any).handleAlipay()

    expect(paymentApiMocks.payAlipay).toHaveBeenCalledWith('order-10')
    expect(appendChild).toHaveBeenCalledTimes(1)
    expect(submit).toHaveBeenCalledTimes(1)
    expect((orderStore.currentOrder as any).payment?.provider).toBe('alipay')

    querySelector.mockRestore()
    appendChild.mockRestore()
  })
})
