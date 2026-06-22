/**
 * DashboardService 单元测试 — 管理仪表盘统计
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { Question } from '../../../database/entities/question.entity';
import { KnowledgePoint } from '../../../database/entities/knowledge-point.entity';
import { mockRepo } from '../../../test-utils';

describe('DashboardService', () => {
  let service: DashboardService;
  let questionRepo: any;
  let kpRepo: any;

  type DashboardDifficultyItem = {
    level: number;
    label: string;
    count: number;
  };

  beforeEach(async () => {
    questionRepo = mockRepo();
    kpRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(Question), useValue: questionRepo },
        { provide: getRepositoryToken(KnowledgePoint), useValue: kpRepo },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  // ═══════════════════════════════════════════════════════════
  // getStats
  // ═══════════════════════════════════════════════════════════

  describe('getStats', () => {
    it('should return all stats fields', async () => {
      questionRepo.count.mockResolvedValue(25);
      kpRepo.count.mockResolvedValue(10);
      questionRepo.createQueryBuilder().getRawMany
        .mockReturnValueOnce([{ subject: '数学', count: '10' }, { subject: '语文', count: '8' }])  // bySubject
        .mockReturnValueOnce([{ grade: '五年级', count: '15' }, { grade: '三年级', count: '10' }]) // byGrade
        .mockReturnValueOnce([{ level: '1', count: '8' }, { level: '2', count: '12' }, { level: '3', count: '5' }]); // byDifficulty

      const result = await service.getStats();

      expect(result.totalQuestions).toBe(25);
      expect(result.totalKnowledgePoints).toBe(10);
      expect(result.bySubject).toHaveLength(2);
      expect(result.byGrade).toHaveLength(2);
      expect(result.byDifficulty).toHaveLength(3);
      expect(result.bySubject).toEqual([
        { subject: '数学', count: 10 },
        { subject: '语文', count: 8 },
      ]);
      expect(result.byGrade).toEqual([
        { grade: '五年级', count: 15 },
        { grade: '三年级', count: 10 },
      ]);
    });

    it('should return zero counts for empty database', async () => {
      questionRepo.count.mockResolvedValue(0);
      kpRepo.count.mockResolvedValue(0);
      questionRepo.createQueryBuilder().getRawMany
        .mockReturnValueOnce([])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([]);

      const result = await service.getStats();

      expect(result.totalQuestions).toBe(0);
      expect(result.totalKnowledgePoints).toBe(0);
      expect(result.bySubject).toEqual([]);
      expect(result.byGrade).toEqual([]);
      expect(result.byDifficulty).toEqual([]);
    });

    it('should map difficulty levels to correct labels', async () => {
      questionRepo.count.mockResolvedValue(5);
      kpRepo.count.mockResolvedValue(1);
      questionRepo.createQueryBuilder().getRawMany
        .mockReturnValueOnce([])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([{ level: '1', count: '3' }, { level: '3', count: '2' }]);

      const result = await service.getStats();

      const diff1 = result.byDifficulty.find((d: DashboardDifficultyItem) => d.level === 1)!;
      const diff3 = result.byDifficulty.find((d: DashboardDifficultyItem) => d.level === 3)!;
      expect(diff1.label).toBe('简单');
      expect(diff3.label).toBe('困难');
    });

    it('should handle unknown difficulty levels gracefully', async () => {
      questionRepo.count.mockResolvedValue(1);
      kpRepo.count.mockResolvedValue(0);
      questionRepo.createQueryBuilder().getRawMany
        .mockReturnValueOnce([])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([{ level: '99', count: '1' }]);

      const result = await service.getStats();

      expect(result.byDifficulty[0].label).toBe('未知');
    });
  });
});
