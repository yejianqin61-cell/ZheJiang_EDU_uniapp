import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.doMock('@/api/index', () => ({
  default: { get: mockGet, post: mockPost, put: vi.fn(), delete: vi.fn() },
}))

describe('Order API', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
  })

  it('createOrder -> POST /orders keeps exercise order type', async () => {
    const { createOrder } = await import('@/api/modules/order')
    const payload = { paperId: 'paper-1', type: 'exercise' as const }
    mockPost.mockResolvedValue({ orderId: 'order-1' })

    await createOrder(payload)

    expect(mockPost).toHaveBeenCalledWith('/orders', payload)
  })

  it('getOrders -> GET /orders with params', async () => {
    const { getOrders } = await import('@/api/modules/order')
    mockGet.mockResolvedValue({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })

    await getOrders({ page: 2, pageSize: 10, type: 'print' })

    expect(mockGet).toHaveBeenCalledWith('/orders', {
      params: { page: 2, pageSize: 10, type: 'print' },
    })
  })

  it('getOrder -> GET /orders/:id', async () => {
    const { getOrder } = await import('@/api/modules/order')
    mockGet.mockResolvedValue({ orderId: 'order-1' })

    await getOrder('order-1')

    expect(mockGet).toHaveBeenCalledWith('/orders/order-1')
  })

  it('getOrderDownload -> GET /orders/:id/download', async () => {
    const { getOrderDownload } = await import('@/api/modules/order')
    mockGet.mockResolvedValue({ docxUrl: 'https://example.com/order-1.docx' })

    await getOrderDownload('order-1')

    expect(mockGet).toHaveBeenCalledWith('/orders/order-1/download')
  })
})
