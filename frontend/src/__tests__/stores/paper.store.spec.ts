/**
 * Paper Store 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('../../api', () => ({
  getConfigOptions: vi.fn(),
  getKnowledgePoints: vi.fn(),
  generatePaper: vi.fn(),
}));

import { usePaperStore } from '../../stores/paper';
import { getKnowledgePoints, generatePaper } from '../../api';

describe('Paper Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have default condition values', () => {
      const store = usePaperStore();
      expect(store.condition.subject).toBe('');
      expect(store.condition.grade).toBe('');
      expect(store.condition.difficulty).toBe('mixed');
      expect(store.condition.questionCount).toBe(20);
      expect(store.currentPaper).toBeNull();
      expect(store.loading).toBe(false);
    });
  });

  describe('fetchKnowledgePoints', () => {
    it('should fetch and store knowledge points', async () => {
      vi.mocked(getKnowledgePoints).mockResolvedValue({
        code: 0, message: 'ok',
        data: [{ id: 'kp-1', name: '加法', questionCount: 5 }],
      } as any);

      const store = usePaperStore();
      store.condition.subject = '数学';
      store.condition.grade = '五年级';

      await store.fetchKnowledgePoints();

      expect(store.knowledgePoints).toHaveLength(1);
      expect(store.knowledgePoints[0].name).toBe('加法');
    });

    it('should not fetch when subject or grade is empty', async () => {
      vi.mocked(getKnowledgePoints).mockResolvedValue({ code: 0, data: [] } as any);
      const store = usePaperStore();

      await store.fetchKnowledgePoints();

      expect(getKnowledgePoints).not.toHaveBeenCalled();
    });
  });

  describe('generate', () => {
    it('should set loading during generation', async () => {
      vi.mocked(generatePaper).mockResolvedValue({
        code: 0, data: { paperId: 'p1', title: '测试卷', questions: [], generateTime: 15 },
      } as any);

      const store = usePaperStore();
      const promise = store.generate();
      expect(store.loading).toBe(true);
      await promise;
      expect(store.loading).toBe(false);
    });

    it('should store paper result on success', async () => {
      vi.mocked(generatePaper).mockResolvedValue({
        code: 0, data: { paperId: 'p1', title: '数学卷', questions: [], generateTime: 10 },
      } as any);

      const store = usePaperStore();
      await store.generate();

      expect(store.currentPaper?.paperId).toBe('p1');
      expect(store.currentPaper?.title).toBe('数学卷');
    });

    it('should reset loading on failure', async () => {
      vi.mocked(generatePaper).mockRejectedValue({ code: 20002, message: '题库不足' });
      const store = usePaperStore();

      await expect(store.generate()).rejects.toEqual({ code: 20002, message: '题库不足' });
      expect(store.loading).toBe(false);
    });
  });

  describe('reset', () => {
    it('should clear current paper', async () => {
      vi.mocked(generatePaper).mockResolvedValue({
        code: 0, data: { paperId: 'p1' },
      } as any);

      const store = usePaperStore();
      await store.generate();
      expect(store.currentPaper).not.toBeNull();

      store.reset();
      expect(store.currentPaper).toBeNull();
    });
  });
});
