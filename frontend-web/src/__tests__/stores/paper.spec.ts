import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePaperStore } from '@/stores/paper'

describe('PaperStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始条件：subject为空，difficulty为mixed，questionCount为20', () => {
    const paper = usePaperStore()
    expect(paper.condition.subject).toBe('')
    expect(paper.condition.grade).toBe('')
    expect(paper.condition.difficulty).toBe('mixed')
    expect(paper.condition.questionCount).toBe(20)
    expect(paper.condition.knowledgePointIds).toEqual([])
  })

  it('currentPaper 初始为 null', () => {
    const paper = usePaperStore()
    expect(paper.currentPaper).toBeNull()
  })

  it('knowledgePoints 初始为空数组', () => {
    const paper = usePaperStore()
    expect(paper.knowledgePoints).toEqual([])
  })

  it('reset 清空 currentPaper', () => {
    const paper = usePaperStore()
    paper.currentPaper = { paperId: 'p1', title: 'test', questions: [], generateTime: 5 }
    paper.reset()
    expect(paper.currentPaper).toBeNull()
  })
})
