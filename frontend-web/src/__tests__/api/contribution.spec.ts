import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.doMock('@/api/index', () => ({
  default: { get: mockGet, post: mockPost, put: vi.fn(), delete: vi.fn() },
}))

vi.doMock('@/api/modules/admin', () => ({
  uploadFile: vi.fn((formData, config) => mockPost('/admin/files/upload', formData, config)),
}))

describe('Contribution API', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
  })

  it('listContributions normalizes list wrapper response', async () => {
    const { listContributions } = await import('@/api/modules/contribution')
    mockGet.mockResolvedValue({ list: [{ id: 'c1' }] })

    await expect(listContributions()).resolves.toEqual([{ id: 'c1' }])
    expect(mockGet).toHaveBeenCalledWith('/contributions')
  })

  it('getContribution -> GET /contributions/:id', async () => {
    const { getContribution } = await import('@/api/modules/contribution')
    mockGet.mockResolvedValue({ id: 'c1' })

    await getContribution('c1')

    expect(mockGet).toHaveBeenCalledWith('/contributions/c1')
  })

  it('getContributionQuestions returns parsed questions', async () => {
    const { getContributionQuestions } = await import('@/api/modules/contribution')
    mockGet.mockResolvedValue({ questions: [{ type: '选择题', content: '1 + 1 = ?' }] })

    await expect(getContributionQuestions('c1')).resolves.toEqual([{ type: '选择题', content: '1 + 1 = ?' }])
  })

  it('submitContribution -> POST /contributions/:id/submit', async () => {
    const { submitContribution } = await import('@/api/modules/contribution')
    mockPost.mockResolvedValue({ ok: true })

    await submitContribution('c1')

    expect(mockPost).toHaveBeenCalledWith('/contributions/c1/submit')
  })

  it('uploadContributionFile delegates multipart upload with config', async () => {
    const { uploadContributionFile } = await import('@/api/modules/contribution')
    const formData = new FormData()
    const onUploadProgress = vi.fn()
    mockPost.mockResolvedValue({ ok: true })

    await uploadContributionFile(formData, { onUploadProgress })

    expect(mockPost).toHaveBeenCalledWith('/admin/files/upload', formData, { onUploadProgress })
  })
})
