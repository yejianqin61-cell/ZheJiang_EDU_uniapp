import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ElMessage } from 'element-plus'
import { usePaperStore } from '@/stores/paper'

const paperApiMocks = vi.hoisted(() => ({
  getKnowledgePoints: vi.fn(),
  generatePaper: vi.fn(),
}))

vi.mock('@/api/modules/paper', () => ({
  getKnowledgePoints: paperApiMocks.getKnowledgePoints,
  generatePaper: paperApiMocks.generatePaper,
}))

describe('PaperStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    paperApiMocks.getKnowledgePoints.mockReset()
    paperApiMocks.generatePaper.mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('initializes default paper condition', () => {
    const paper = usePaperStore()

    expect(paper.condition.subject).toBe('')
    expect(paper.condition.grade).toBe('')
    expect(paper.condition.difficulty).toBe('mixed')
    expect(paper.condition.questionCount).toBe(20)
    expect(paper.condition.knowledgePointIds).toEqual([])
  })

  it('currentPaper starts as null', () => {
    const paper = usePaperStore()
    expect(paper.currentPaper).toBeNull()
  })

  it('fetchKnowledgePoints loads normalized knowledge points', async () => {
    const paper = usePaperStore()
    paper.condition.subject = '数学'
    paper.condition.grade = '五年级'
    paperApiMocks.getKnowledgePoints.mockResolvedValue({ list: [{ id: 'kp-1', name: '分数', questionCount: 12 }] })

    await paper.fetchKnowledgePoints()

    expect(paperApiMocks.getKnowledgePoints).toHaveBeenCalledWith('数学', '五年级')
    expect(paper.knowledgePoints).toEqual([{ id: 'kp-1', name: '分数', questionCount: 12 }])
  })

  it('fetchKnowledgePoints shows error and clears list on failure', async () => {
    const paper = usePaperStore()
    paper.condition.subject = '数学'
    paper.condition.grade = '五年级'
    paper.knowledgePoints = [{ id: 'kp-old', name: '旧数据', questionCount: 1 }]
    paperApiMocks.getKnowledgePoints.mockRejectedValue({ code: 500 })

    await paper.fetchKnowledgePoints()

    expect(paper.knowledgePoints).toEqual([])
    expect(ElMessage.error).toHaveBeenCalledWith('知识点加载失败')
  })

  it('generate stores generated paper result', async () => {
    const paper = usePaperStore()
    const result = { paperId: 'paper-1', title: '测试卷', questions: [], generateTime: 3 }
    paperApiMocks.generatePaper.mockResolvedValue(result)

    await paper.generate()

    expect(paperApiMocks.generatePaper).toHaveBeenCalledWith(paper.condition)
    expect(paper.currentPaper).toEqual(result)
    expect(paper.loading).toBe(false)
  })

  it('reset clears currentPaper', () => {
    const paper = usePaperStore()
    paper.currentPaper = { paperId: 'p1', title: 'test', questions: [], generateTime: 5 }
    paper.reset()
    expect(paper.currentPaper).toBeNull()
  })
})
