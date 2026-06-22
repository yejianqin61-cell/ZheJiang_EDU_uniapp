import { defineStore } from 'pinia'
import { ref } from 'vue'
import { generatePaper, getKnowledgePoints } from '@/api/modules/paper'
import type { KnowledgePointItem, PaperCondition, PaperResult } from '@/types'

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
    if (!condition.value.subject || !condition.value.grade) {
      return
    }

    try {
      const data = await getKnowledgePoints(condition.value.subject, condition.value.grade)
      knowledgePoints.value = Array.isArray(data) ? data : (data?.list ?? [])
    }
    catch {}
  }

  async function generate() {
    loading.value = true

    try {
      currentPaper.value = await generatePaper(condition.value)
    }
    finally {
      loading.value = false
    }
  }

  function reset() {
    currentPaper.value = null
  }

  return { condition, currentPaper, knowledgePoints, loading, fetchKnowledgePoints, generate, reset }
})
