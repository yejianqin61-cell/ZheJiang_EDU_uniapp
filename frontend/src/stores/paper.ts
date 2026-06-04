import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PaperCondition, PaperResult, KnowledgePointItem } from '../types';
import {
  getConfigOptions, getKnowledgePoints, generatePaper,
} from '../api';

export const usePaperStore = defineStore('paper', () => {
  const condition = ref<PaperCondition>({
    subject: '',
    grade: '',
    knowledgePointIds: [],
    difficulty: 'mixed',
    questionCount: 20,
  });

  const currentPaper = ref<PaperResult | null>(null);
  const knowledgePoints = ref<KnowledgePointItem[]>([]);
  const loading = ref(false);

  async function fetchKnowledgePoints() {
    if (!condition.value.subject || !condition.value.grade) return;
    const res = await getKnowledgePoints(condition.value.subject, condition.value.grade);
    knowledgePoints.value = res.data;
  }

  async function generate() {
    loading.value = true;
    try {
      const res = await generatePaper(condition.value);
      currentPaper.value = res.data;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    currentPaper.value = null;
  }

  return {
    condition, currentPaper, knowledgePoints, loading,
    fetchKnowledgePoints, generate, reset,
  };
});
