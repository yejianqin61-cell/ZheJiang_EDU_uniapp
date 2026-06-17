/**
 * ReviewService 单元测试 — 题目审核服务 V2.0（含返现逻辑）
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReviewService } from './review.service';
import { Question } from '../../../database/entities/question.entity';
import { KbFile } from '../../../database/entities/kb-file.entity';
import { User } from '../../../database/entities/user.entity';
import { PricingConfig } from '../../../database/entities/pricing-config.entity';
import { BalanceService } from '../../balance/services/balance.service';
import { mockRepo } from '../../../test-utils';

describe('ReviewService', () => {
  let service: ReviewService;
  let questionRepo: any;
  let fileRepo: any;
  let userRepo: any;
  let pricingRepo: any;
  let balanceService: any;

  beforeEach(async () => {
    questionRepo = mockRepo();
    fileRepo = mockRepo();
    userRepo = mockRepo();
    pricingRepo = mockRepo();
    balanceService = { addBalance: jest.fn().mockResolvedValue({ balance: 100 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: getRepositoryToken(Question), useValue: questionRepo },
        { provide: getRepositoryToken(KbFile), useValue: fileRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(PricingConfig), useValue: pricingRepo },
        { provide: BalanceService, useValue: balanceService },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  describe('getPendingList', () => {
    it('should return parsed AND pending_review questions', async () => {
      const mockQb = questionRepo.createQueryBuilder();
      mockQb.getManyAndCount.mockResolvedValue([
        [
          { id: 'q-1', status: 'parsed', content: '题目1', sourceFile: null, questionKnowledge: [] },
          { id: 'q-2', status: 'pending_review', content: '题目2', sourceFile: null, questionKnowledge: [] },
        ],
        2,
      ]);

      const result = await service.getPendingList({ page: 1, pageSize: 20 });

      expect(result.list).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should include source info for teacher-uploaded questions', async () => {
      const mockQb = questionRepo.createQueryBuilder();
      mockQb.getManyAndCount.mockResolvedValue([
        [{
          id: 'q-1', status: 'pending_review', content: '题目1',
          sourceFile: { id: 'f1', filename: 'test.docx', uploader: { id: 'u1', role: 'teacher', nickname: '张老师' } },
          questionKnowledge: [],
        }],
        1,
      ]);

      const result = await service.getPendingList({ page: 1, pageSize: 20 });

      expect(result.list[0].source.type).toBe('teacher');
      expect(result.list[0].source.userName).toBe('张老师');
    });
  });

  describe('batchReview — approve', () => {
    it('should approve all pending questions', async () => {
      questionRepo.find.mockResolvedValue([
        { id: 'q-1', status: 'parsed', isDeleted: false, sourceFileId: null, sourceFile: null, content: 'test', subject: '数学' },
        { id: 'q-2', status: 'pending_review', isDeleted: false, sourceFileId: null, sourceFile: null, content: 'test2', subject: '数学' },
      ]);
      questionRepo.count.mockResolvedValue(0);
      pricingRepo.findOne.mockResolvedValue({ unitPrice: 100 });

      const result = await service.batchReview('admin-1', ['q-1', 'q-2'], 'approve');

      expect(result.approved).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should trigger cashback for teacher-uploaded approved questions', async () => {
      questionRepo.find.mockResolvedValue([{
        id: 'q-1', status: 'pending_review', isDeleted: false, sourceFileId: 'f1',
        sourceFile: { id: 'f1', uploader: { id: 'u1', role: 'teacher' } },
        content: '题目', subject: '数学',
      }]);
      questionRepo.count.mockResolvedValue(0);
      pricingRepo.findOne.mockResolvedValue({ unitPrice: 100 });

      await service.batchReview('admin-1', ['q-1'], 'approve');

      expect(balanceService.addBalance).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u1',
        amount: 100,
        type: 'cashback',
      }));
    });

    it('should NOT trigger cashback for admin-uploaded questions', async () => {
      questionRepo.find.mockResolvedValue([{
        id: 'q-1', status: 'parsed', isDeleted: false, sourceFileId: 'f1',
        sourceFile: { id: 'f1', uploader: { id: 'admin1', role: 'admin' } },
        content: '题目', subject: '数学',
      }]);
      questionRepo.count.mockResolvedValue(0);
      pricingRepo.findOne.mockResolvedValue({ unitPrice: 100 });

      await service.batchReview('admin-1', ['q-1'], 'approve');

      expect(balanceService.addBalance).not.toHaveBeenCalled();
    });
  });

  describe('batchReview — reject', () => {
    it('should reject all pending questions', async () => {
      questionRepo.find.mockResolvedValue([
        { id: 'q-1', status: 'parsed', isDeleted: false, sourceFileId: null, sourceFile: null, content: 'test', subject: '数学' },
      ]);
      pricingRepo.findOne.mockResolvedValue({ unitPrice: 100 });

      const result = await service.batchReview('admin-1', ['q-1'], 'reject');

      expect(result.rejected).toBe(1);
      expect(questionRepo.update).toHaveBeenCalledWith('q-1', expect.objectContaining({ status: 'rejected' }));
      expect(balanceService.addBalance).not.toHaveBeenCalled();
    });
  });

  describe('batchReview — partial failure', () => {
    it('should report IDs not found in DB', async () => {
      questionRepo.find.mockResolvedValue([
        { id: 'q-1', status: 'parsed', isDeleted: false, sourceFileId: null, sourceFile: null, content: 'test', subject: '数学' },
      ]);
      pricingRepo.findOne.mockResolvedValue({ unitPrice: 100 });

      const result = await service.batchReview('admin-1', ['q-1', 'q-2', 'q-3'], 'approve');

      expect(result.approved).toBe(1);
      expect(result.failed).toBe(2);
    });
  });
});
