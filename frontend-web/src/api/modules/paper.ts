import api from '../index'

/** 组卷条件配置（年级/科目选项） */
export function getPaperConfig() {
  return api.get('/papers/config-options')
}

/** 获取知识点列表 */
export function getKnowledgePoints(subject: string, grade: string) {
  return api.get('/papers/knowledge-points', { params: { subject, grade } })
}

/** AI 生成试卷 */
export function generatePaper(params: {
  grade: string; subject: string; knowledgePointIds?: string[]; difficulty: string; questionCount: number
}) {
  return api.post('/papers/generate', params)
}

/** 获取试卷详情 */
export function getPaper(paperId: string) {
  return api.get(`/papers/${paperId}`)
}

/** 导出试卷 DOCX */
export function exportDocx(paperId: string) {
  return api.post(`/papers/${paperId}/export/docx`)
}
