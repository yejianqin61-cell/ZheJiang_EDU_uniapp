import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.doMock('@/api/index', () => ({
  default: { get: mockGet, post: mockPost, put: vi.fn(), delete: vi.fn() },
}))

describe('Payment API', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
  })

  it('payAlipay -> POST /orders/:id/alipay', async () => {
    const { payAlipay } = await import('@/api/modules/payment')
    mockPost.mockResolvedValue({ paymentId: 'pay-1', payForm: '<form id="pay"></form>' })

    const response = await payAlipay('order-1')

    expect(mockPost).toHaveBeenCalledWith('/orders/order-1/alipay')
    expect(response.paymentId).toBe('pay-1')
  })

  it('payMock -> POST /orders/:id/mock-pay', async () => {
    const { payMock } = await import('@/api/modules/payment')
    mockPost.mockResolvedValue(undefined)

    await payMock('order-1')

    expect(mockPost).toHaveBeenCalledWith('/orders/order-1/mock-pay')
  })

  it('checkPayStatus -> GET /orders/:id/payment-status', async () => {
    const { checkPayStatus } = await import('@/api/modules/payment')
    mockGet.mockResolvedValue({ orderId: 'order-1', status: 'paid', paidAt: '2026-06-22T00:00:00Z' })

    const response = await checkPayStatus('order-1')

    expect(mockGet).toHaveBeenCalledWith('/orders/order-1/payment-status')
    expect(response.status).toBe('paid')
  })
})
