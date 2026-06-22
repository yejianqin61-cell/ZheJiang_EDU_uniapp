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

describe('Exercise API', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
    mockPut.mockReset()
    mockDelete.mockReset()
  })

  it('getExerciseCategories -> GET /exercise/categories', async () => {
    const { getExerciseCategories } = await import('@/api/modules/exercise')
    mockGet.mockResolvedValue([{ id: 'c1' }])

    await getExerciseCategories({ type: 'sync', grade: '五年级', subject: '数学' })

    expect(mockGet).toHaveBeenCalledWith('/exercise/categories', {
      params: { type: 'sync', grade: '五年级', subject: '数学' },
    })
  })

  it('drawCategory -> POST /exercise/categories/:id/draw', async () => {
    const { drawCategory } = await import('@/api/modules/exercise')
    mockPost.mockResolvedValue({ orderId: 'o1' })

    await drawCategory('cat-1')

    expect(mockPost).toHaveBeenCalledWith('/exercise/categories/cat-1/draw')
  })

  it('getPapersByLesson -> GET /exercise/papers with lessonId', async () => {
    const { getPapersByLesson } = await import('@/api/modules/exercise')
    mockGet.mockResolvedValue([{ id: 'p1' }])

    await getPapersByLesson('lesson-1')

    expect(mockGet).toHaveBeenCalledWith('/exercise/papers', {
      params: { lessonId: 'lesson-1' },
    })
  })

  it('uploadExercisePaper -> POST /exercise-contributions/upload with multipart form', async () => {
    const { uploadExercisePaper } = await import('@/api/modules/exercise')
    const fd = new FormData()
    mockPost.mockResolvedValue({ id: 'upload-1' })

    await uploadExercisePaper(fd)

    expect(mockPost).toHaveBeenCalledWith('/exercise-contributions/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  })

  it('getMyExerciseUploads -> GET /exercise-contributions', async () => {
    const { getMyExerciseUploads } = await import('@/api/modules/exercise')
    mockGet.mockResolvedValue({ list: [] })

    await getMyExerciseUploads({ page: 1, pageSize: 20, status: 'pending_review' })

    expect(mockGet).toHaveBeenCalledWith('/exercise-contributions', {
      params: { page: 1, pageSize: 20, status: 'pending_review' },
    })
  })

  it('adminListExerciseUploads -> GET /exercise-contributions/admin/list', async () => {
    const { adminListExerciseUploads } = await import('@/api/modules/exercise')
    mockGet.mockResolvedValue({ list: [] })

    await adminListExerciseUploads({ page: 1, pageSize: 20, status: 'pending_review', subject: '数学' })

    expect(mockGet).toHaveBeenCalledWith('/exercise-contributions/admin/list', {
      params: { page: 1, pageSize: 20, status: 'pending_review', subject: '数学' },
    })
  })

  it('adminApproveExerciseUpload -> POST /exercise-contributions/admin/:id/approve', async () => {
    const { adminApproveExerciseUpload } = await import('@/api/modules/exercise')
    mockPost.mockResolvedValue({ paperId: 'paper-1' })

    await adminApproveExerciseUpload('upload-1')

    expect(mockPost).toHaveBeenCalledWith('/exercise-contributions/admin/upload-1/approve')
  })

  it('adminCreatePaper -> POST /admin/exercise/papers with multipart form', async () => {
    const { adminCreatePaper } = await import('@/api/modules/exercise')
    const payload = new FormData()
    mockPost.mockResolvedValue({ id: 'paper-1' })

    await adminCreatePaper(payload)

    expect(mockPost).toHaveBeenCalledWith('/admin/exercise/papers', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  })

  it('adminRejectExerciseUpload -> POST /exercise-contributions/admin/:id/reject', async () => {
    const { adminRejectExerciseUpload } = await import('@/api/modules/exercise')
    mockPost.mockResolvedValue({ status: 'rejected' })

    await adminRejectExerciseUpload('upload-1', '文件模糊')

    expect(mockPost).toHaveBeenCalledWith('/exercise-contributions/admin/upload-1/reject', {
      note: '文件模糊',
    })
  })

  it('adminBatchExerciseUploads -> POST /exercise-contributions/admin/batch', async () => {
    const { adminBatchExerciseUploads } = await import('@/api/modules/exercise')
    mockPost.mockResolvedValue([{ id: 'upload-1', success: true }])

    await adminBatchExerciseUploads({ ids: ['upload-1'], action: 'approve' })

    expect(mockPost).toHaveBeenCalledWith('/exercise-contributions/admin/batch', {
      ids: ['upload-1'],
      action: 'approve',
    })
  })
})
