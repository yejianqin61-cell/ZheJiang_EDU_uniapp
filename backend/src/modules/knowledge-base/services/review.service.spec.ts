/**
 * ReviewService 单元测试 — 题目审核服务
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReviewService } from './review.service';
import { Question } from '../../../database/entities/question.entity';
import { mockRepo } from '../../../test-utils';

describe('ReviewService', () => {
  let service: ReviewService;
  let questionRepo: any;

  beforeEach(async () => {
    questionRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: getRepositoryToken(Question), useValue: questionRepo },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  // ═══════════════════════════════════════════════════════════
  // getPendingList
  // ═══════════════════════════════════════════════════════════

  describe('getPendingList', () => {
    it('should return pending (parsed) questions', async () => {
      const mockQb = questionRepo.createQueryBuilder();
      mockQb.getManyAndCount.mockResolvedValue([
        [
          { id: 'q-1', status: 'parsed', content: '题目1' },
          { id: 'q-2', status: 'parsed', content: '题目2' },
        ],
        2,
      ]);

      const result = await service.getPendingList({ page: 1, pageSize: 20 });

      expect(result.list).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should return empty list when no pending questions', async () => {
      questionRepo.createQueryBuilder().getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.getPendingList({ page: 1, pageSize: 20 });

      expect(result.list).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should filter by fileId', async () => {
      const mockQb = questionRepo.createQueryBuilder();
      mockQb.getManyAndCount.mockResolvedValue([[{ id: 'q-1', status: 'parsed' }], 1]);

      const result = await service.getPendingList({ page: 1, pageSize: 20 }, 'file-1');

      expect(result.list).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // batchReview — approve
  // ═══════════════════════════════════════════════════════════

  describe('batchReview — approve', () => {
    it('should approve all pending questions', async () => {
      questionRepo.find.mockResolvedValue([
        { id: 'q-1', status: 'parsed', isDeleted: false },
        { id: 'q-2', status: 'parsed', isDeleted: false },
        { id: 'q-3', status: 'parsed', isDeleted: false },
      ]);

      const result = await service.batchReview('admin-1', ['q-1', 'q-2', 'q-3'], 'approve');

      expect(result.approved).toBe(3);
      expect(result.failed).toBe(0);
      expect(questionRepo.update).toHaveBeenCalledTimes(3);
    });

    it('should set reviewer metadata on approval', async () => {
      questionRepo.find.mockResolvedValue([{ id: 'q-1', status: 'parsed', isDeleted: false }]);

      await service.batchReview('admin-1', ['q-1'], 'approve');

      expect(questionRepo.update).toHaveBeenCalledWith('q-1', expect.objectContaining({
        status: 'approved',
        reviewedById: 'admin-1',
        reviewedAt: expect.any(Date),
      }));
    });
  });

  // ═══════════════════════════════════════════════════════════
  // batchReview — reject
  // ═══════════════════════════════════════════════════════════

  describe('batchReview — reject', () => {
    it('should reject all pending questions', async () => {
      questionRepo.find.mockResolvedValue([
        { id: 'q-1', status: 'parsed', isDeleted: false },
      ]);

      const result = await service.batchReview('admin-1', ['q-1'], 'reject');

      expect(result.rejected).toBe(1);
      expect(questionRepo.update).toHaveBeenCalledWith('q-1', expect.objectContaining({
        status: 'rejected',
      }));
    });
  });

  // ═══════════════════════════════════════════════════════════
  // batchReview — partial failure
  // ═══════════════════════════════════════════════════════════

  describe('batchReview — partial failure', () => {
    it('should report IDs not found in DB', async () => {
      questionRepo.find.mockResolvedValue([
        { id: 'q-1', status: 'parsed', isDeleted: false },
        // q-2 and q-3 not returned → not found
      ]);

      const result = await service.batchReview('admin-1', ['q-1', 'q-2', 'q-3'], 'approve');

      expect(result.approved).toBe(1);
      expect(result.failed).toBe(2);
      expect(result.failedIds).toContain('q-2');
      expect(result.failedIds).toContain('q-3');
    });

    it('should skip already-approved questions', async () => {
      // Only parsed questions are returned; already-approved ones are filtered by query
      questionRepo.find.mockResolvedValue([
        { id: 'q-1', status: 'parsed', isDeleted: false },
      ]);

      const result = await service.batchReview('admin-1', ['q-1', 'q-already-approved'], 'approve');

      expect(result.approved).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should handle empty questionIds array', async () => {
      questionRepo.find.mockResolvedValue([]);

      const result = await service.batchReview('admin-1', [], 'approve');

      expect(result.approved).toBe(0);
      expect(result.failed).toBe(0);
    });
  });
});
