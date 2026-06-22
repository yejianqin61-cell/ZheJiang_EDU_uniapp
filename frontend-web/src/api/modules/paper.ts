import api from '../index'
import type { KnowledgePointItem, PaperCondition, PaperResult } from '@/types'

export function getPaperConfig() {
  return api.get('/papers/config-options')
}

export function getKnowledgePoints(subject: string, grade: string) {
  return api.get<KnowledgePointItem[] | { list: KnowledgePointItem[] }>('/papers/knowledge-points', {
    params: { subject, grade },
  })
}

export function generatePaper(params: PaperCondition) {
  return api.post<PaperResult>('/papers/generate', params)
}

export function getPaper(paperId: string) {
  return api.get<PaperResult>(`/papers/${paperId}`)
}

export function exportDocx(paperId: string) {
  return api.post(`/papers/${paperId}/export/docx`)
}
