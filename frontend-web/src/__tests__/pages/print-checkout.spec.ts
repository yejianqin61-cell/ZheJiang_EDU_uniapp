import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ElMessage } from 'element-plus'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrderStore } from '@/stores/order'
import PrintCheckoutPage from '@/pages/print/checkout/index.vue'

const routerPush = vi.fn()
const routerReplace = vi.fn()
const routeState = vi.hoisted(() => ({
  query: { paperId: 'paper-1' as string | undefined },
}))
const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
  }),
}))

vi.mock('@/api/index', () => ({
  default: apiMocks,
}))

const mountPage = () =>
  mount(PrintCheckoutPage, {
    global: {
      plugins: [createPinia()],
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        'el-input-number': true,
        'el-select': { template: '<div><slot /></div>' },
        'el-option': true,
        'el-button': { template: '<button><slot /></button>' },
        'el-table': { template: '<div />' },
        'el-table-column': true,
      },
    },
  })

describe('Print checkout page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    routeState.query.paperId = 'paper-1'
    routerPush.mockReset()
    routerReplace.mockReset()
    apiMocks.get.mockReset()
    apiMocks.post.mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('redirects to paper config when paper id is missing', async () => {
    routeState.query.paperId = undefined

    mountPage()
    await Promise.resolve()

    expect(ElMessage.warning).toHaveBeenCalledWith('请从试卷预览页进入')
    expect(routerReplace).toHaveBeenCalledWith('/paper/config')
  })

  it('warns when shipping address is not selected', async () => {
    apiMocks.get.mockResolvedValueOnce({ print: [] })
    apiMocks.get.mockResolvedValueOnce([])

    const wrapper = mountPage()
    await Promise.resolve()
    await Promise.resolve()

    await (wrapper.vm as any).handleSubmit()

    expect(ElMessage.warning).toHaveBeenCalledWith('请选择收货地址')
    expect(apiMocks.post).not.toHaveBeenCalled()
  })

  it('creates print order and navigates to payment page', async () => {
    apiMocks.get.mockResolvedValueOnce({ print: [{ minQuantity: 1, maxQuantity: null, unitPrice: 200 }] })
    apiMocks.get.mockResolvedValueOnce([{ id: 'addr-1', receiverName: '张三', phone: '13800000000', province: '浙', city: '杭', district: '西湖', detail: '1号' }])
    apiMocks.post.mockResolvedValue({
      orderId: 'order-1',
      orderNo: 'NO001',
      amount: 2000,
      type: 'print',
    })

    const wrapper = mountPage()
    const orderStore = useOrderStore()
    await Promise.resolve()
    await Promise.resolve()

    ;(wrapper.vm as any).selectedAddr = 'addr-1'
    await (wrapper.vm as any).handleSubmit()

    expect(apiMocks.post).toHaveBeenCalledWith('/orders', {
      paperId: 'paper-1',
      type: 'print',
      copies: 10,
      shippingAddressId: 'addr-1',
    })
    expect(orderStore.currentOrder?.orderId).toBe('order-1')
    expect(ElMessage.success).toHaveBeenCalledWith('订单已创建')
    expect(routerPush).toHaveBeenCalledWith('/payment?paperId=paper-1&type=print')
  })
})
