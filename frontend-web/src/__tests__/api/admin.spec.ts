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

  it('getQuestion -> GET /admin/questions/:id', async () => {
    const { getQuestion } = await import('@/api/modules/admin')
    mockGet.mockResolvedValue({ id: 'q-1' })

    await getQuestion('q-1')

    expect(mockGet).toHaveBeenCalledWith('/admin/questions/q-1')
  })

  it('getReviewList -> GET /admin/reviews', async () => {
    const { getReviewList } = await import('@/api/modules/admin')
    mockGet.mockResolvedValue({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })

    await getReviewList({ page: 2, pageSize: 10 })

    expect(mockGet).toHaveBeenCalledWith('/admin/reviews', {
      params: { page: 2, pageSize: 10 },
    })
  })

  it('getReviewDetail -> GET /admin/reviews/:id', async () => {
    const { getReviewDetail } = await import('@/api/modules/admin')
    mockGet.mockResolvedValue({ id: 'review-1' })

    await getReviewDetail('review-1')

    expect(mockGet).toHaveBeenCalledWith('/admin/reviews/review-1')
  })

  it('getPricing -> GET /admin/pricing', async () => {
    const { getPricing } = await import('@/api/modules/admin')
    mockGet.mockResolvedValue({ download: { unitPrice: 200, description: '按题计费' } })

    await getPricing()

    expect(mockGet).toHaveBeenCalledWith('/admin/pricing')
  })

  it('uploadFile -> POST /admin/files/upload with multipart headers', async () => {
    const { uploadFile } = await import('@/api/modules/admin')
    const formData = new FormData()
    const onUploadProgress = vi.fn()
    mockPost.mockResolvedValue({ ok: true })

    await uploadFile(formData, { onUploadProgress })

    expect(mockPost).toHaveBeenCalledWith('/admin/files/upload', formData, {
      onUploadProgress,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  })

  it('updatePricing -> PUT /admin/pricing', async () => {
    const { updatePricing } = await import('@/api/modules/admin')
    const payload = {
      download: { unitPrice: 200, description: '按题计费' },
      print: [{ tier: 1, minQuantity: 1, maxQuantity: 10, unitPrice: 500 }],
      cashback: { unitPrice: 100 },
      exerciseCashback: { unitPrice: 500 },
      exercise: { unitPrice: 500 },
    }
    mockPut.mockResolvedValue({ ok: true })

    await updatePricing(payload as any)

    expect(mockPut).toHaveBeenCalledWith('/admin/pricing', payload)
  })

  it('getKnowledgePoints -> GET /admin/knowledge-points with params', async () => {
    const { getKnowledgePoints } = await import('@/api/modules/admin')
    mockGet.mockResolvedValue({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })

    await getKnowledgePoints({ page: 1, pageSize: 20, subject: '数学', grade: '五年级' })

    expect(mockGet).toHaveBeenCalledWith('/admin/knowledge-points', {
      params: { page: 1, pageSize: 20, subject: '数学', grade: '五年级' },
    })
  })

  it('batchDeleteQuestions -> POST /admin/questions/batch-delete with questionIds', async () => {
    const { batchDeleteQuestions } = await import('@/api/modules/admin')
    mockPost.mockResolvedValue({ deleted: 2 })

    await batchDeleteQuestions(['q-1', 'q-2'])

    expect(mockPost).toHaveBeenCalledWith('/admin/questions/batch-delete', {
      questionIds: ['q-1', 'q-2'],
    })
  })

  it('batchReview -> POST /admin/reviews/batch with questionIds', async () => {
    const { batchReview } = await import('@/api/modules/admin')
    mockPost.mockResolvedValue({ approved: 2 })

    await batchReview(['q-1', 'q-2'], 'approve')

    expect(mockPost).toHaveBeenCalledWith('/admin/reviews/batch', {
      questionIds: ['q-1', 'q-2'],
      action: 'approve',
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

  it('deleteQuestion -> DELETE /admin/questions/:id', async () => {
    const { deleteQuestion } = await import('@/api/modules/admin')
    mockDelete.mockResolvedValue({ ok: true })

    await deleteQuestion('q-7')

    expect(mockDelete).toHaveBeenCalledWith('/admin/questions/q-7')
  })

  it('getAdminOrders -> GET /orders keeps requested scope', async () => {
    const { getAdminOrders } = await import('@/api/modules/admin')
    mockGet.mockResolvedValue({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })

    await getAdminOrders({ page: 1, pageSize: 20, scope: 'mine', type: 'download' })

    expect(mockGet).toHaveBeenCalledWith('/orders', {
      params: { page: 1, pageSize: 20, scope: 'mine', type: 'download' },
    })
  })

  it('getWithdrawals -> GET /admin/withdrawals with typed params', async () => {
    const { getWithdrawals } = await import('@/api/modules/admin')
    mockGet.mockResolvedValue({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })

    await getWithdrawals({ page: 2, pageSize: 10, status: 'pending' })

    expect(mockGet).toHaveBeenCalledWith('/admin/withdrawals', {
      params: { page: 2, pageSize: 10, status: 'pending' },
    })
  })
})
