import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PaperCondition, PaperResult, KnowledgePointItem } from '@/types'
import api from '@/api/index'

export const usePaperStore = defineStore('paper', () => {
  const condition = ref<PaperCondition>({
    subject: '',
    grade: '',
    knowledgePointIds: [],
    difficulty: 'mixed',
    questionCount: 20,
  })

  const currentPaper = ref<PaperResult | null>(null)
  const knowledgePoints = ref<KnowledgePointItem[]>([])
  const loading = ref(false)

  async function fetchKnowledgePoints() {
    if (!condition.value.subject || !condition.value.grade) return
    try {
      const data = await api.get('/papers/knowledge-points', {
        params: { subject: condition.value.subject, grade: condition.value.grade },
      })
      knowledgePoints.value = Array.isArray(data) ? data : (data?.list ?? data ?? [])
    } catch { /* ignore */ }
  }

  async function generate() {
    loading.value = true
    try {
      const data = await api.post('/papers/generate', condition.value)
      currentPaper.value = data
    } finally {
      loading.value = false
    }
  }

  function reset() {
    currentPaper.value = null
  }

  return { condition, currentPaper, knowledgePoints, loading, fetchKnowledgePoints, generate, reset }
})
