import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useOrderStore } from '@/stores/order'

const orderApiMocks = vi.hoisted(() => ({
  getOrders: vi.fn(),
  createOrder: vi.fn(),
}))

vi.mock('@/api/modules/order', () => ({
  getOrders: orderApiMocks.getOrders,
  createOrder: orderApiMocks.createOrder,
}))

describe('OrderStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    orderApiMocks.getOrders.mockReset()
    orderApiMocks.createOrder.mockReset()
  })

  it('initializes with empty orders and default tab', () => {
    const order = useOrderStore()

    expect(order.orders).toEqual([])
    expect(order.currentOrder).toBeNull()
    expect(order.activeTab).toBe('download')
  })

  it('uses default pagination values', () => {
    const order = useOrderStore()

    expect(order.pagination.page).toBe(1)
    expect(order.pagination.pageSize).toBe(20)
    expect(order.pagination.total).toBe(0)
    expect(order.pagination.totalPages).toBe(0)
  })

  it('fetchOrders loads order list and pagination from api module', async () => {
    const order = useOrderStore()
    orderApiMocks.getOrders.mockResolvedValue({
      list: [{ orderId: 'order-1', orderNo: 'NO001', paperTitle: '数学卷', amount: 1200, status: 'paid', createdAt: '2026-06-22' }],
      pagination: { page: 2, pageSize: 20, total: 1, totalPages: 1 },
    })

    await order.fetchOrders(2, 'print')

    expect(orderApiMocks.getOrders).toHaveBeenCalledWith({
      page: 2,
      pageSize: 20,
      type: 'print',
    })
    expect(order.orders).toHaveLength(1)
    expect(order.pagination.page).toBe(2)
  })

  it('create keeps current order from api module response', async () => {
    const order = useOrderStore()
    const response = { orderId: 'order-2', orderNo: 'NO002', type: 'exercise', amount: 800, unitPrice: 800 }
    orderApiMocks.createOrder.mockResolvedValue(response)

    await expect(order.create('paper-2', 'exercise')).resolves.toEqual(response)

    expect(orderApiMocks.createOrder).toHaveBeenCalledWith({
      paperId: 'paper-2',
      type: 'exercise',
      copies: undefined,
      shippingAddressId: undefined,
    })
    expect(order.currentOrder).toEqual(response)
  })
})
