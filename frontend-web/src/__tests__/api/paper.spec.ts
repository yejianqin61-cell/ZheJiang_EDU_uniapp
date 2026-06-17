import { describe, it, expect, vi } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()
vi.doMock('@/api/index', () => ({ default: { get: mockGet, post: mockPost, put: vi.fn(), delete: vi.fn() } }))

describe('Paper API', () => {
  it('getPaperConfig → GET /papers/config-options', async () => {
    const { getPaperConfig } = await import('@/api/modules/paper')
    mockGet.mockResolvedValue({ stages: ['小学'] })
    await getPaperConfig()
    expect(mockGet).toHaveBeenCalledWith('/papers/config-options')
  })

  it('generatePaper → POST /papers/generate', async () => {
    const { generatePaper } = await import('@/api/modules/paper')
    mockPost.mockResolvedValue({ paperId: 'p1', title: 'test' })
    const r = await generatePaper({ grade: '五年级', subject: '数学', difficulty: 'mixed', questionCount: 10 })
    expect(mockPost).toHaveBeenCalledWith('/papers/generate', { grade: '五年级', subject: '数学', difficulty: 'mixed', questionCount: 10 })
    expect(r.paperId).toBe('p1')
  })

  it('getPaper → GET /papers/:id', async () => {
    const { getPaper } = await import('@/api/modules/paper')
    mockGet.mockResolvedValue({ paperId: 'p1' })
    await getPaper('p1')
    expect(mockGet).toHaveBeenCalledWith('/papers/p1')
  })

  it('exportDocx → POST /papers/:id/export/docx', async () => {
    const { exportDocx } = await import('@/api/modules/paper')
    mockPost.mockResolvedValue({ downloadUrl: 'https://...' })
    await exportDocx('p1')
    expect(mockPost).toHaveBeenCalledWith('/papers/p1/export/docx')
  })
})
