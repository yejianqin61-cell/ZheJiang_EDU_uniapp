import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()

vi.doMock('@/api/index', () => ({
  default: { get: mockGet, post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

describe('Pricing API', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('getPublicPricing -> GET /pricing/public', async () => {
    const { getPublicPricing } = await import('@/api/modules/pricing')
    mockGet.mockResolvedValue({ print: [] })

    await getPublicPricing()

    expect(mockGet).toHaveBeenCalledWith('/pricing/public')
  })
})
