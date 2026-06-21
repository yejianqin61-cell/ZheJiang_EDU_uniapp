import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()

vi.doMock('@/api/index', () => ({
  default: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
  },
}))

describe('Admin API', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
    mockPut.mockReset()
    mockDelete.mockReset()
  })

  it('getDashboardStats -> GET /admin/questions/stats', async () => {
    const { getDashboardStats } = await import('@/api/modules/admin')
    mockGet.mockResolvedValue({ totalQuestions: 10 })

    await getDashboardStats()

    expect(mockGet).toHaveBeenCalledWith('/admin/questions/stats')
  })

  it('batchDeleteQuestions -> POST /admin/questions/batch-delete with questionIds', async () => {
    const { batchDeleteQuestions } = await import('@/api/modules/admin')
    mockPost.mockResolvedValue({ deleted: 2 })

    await batchDeleteQuestions(['q-1', 'q-2'])

    expect(mockPost).toHaveBeenCalledWith('/admin/questions/batch-delete', {
      questionIds: ['q-1', 'q-2'],
    })
  })

  it('rejectWithdrawal -> PUT /admin/withdrawals/:id with rejectReason', async () => {
    const { rejectWithdrawal } = await import('@/api/modules/admin')
    mockPut.mockResolvedValue({ ok: true })

    await rejectWithdrawal('wd-1', '资料不完整')

    expect(mockPut).toHaveBeenCalledWith('/admin/withdrawals/wd-1', {
      action: 'reject',
      rejectReason: '资料不完整',
    })
  })
})
