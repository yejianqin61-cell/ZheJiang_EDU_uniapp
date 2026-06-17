import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ContributionService } from './contribution.service';
import { KbFile } from '../../../database/entities/kb-file.entity';
import { Question } from '../../../database/entities/question.entity';
import { KnowledgePoint } from '../../../database/entities/knowledge-point.entity';
import { QuestionKnowledge } from '../../../database/entities/question-knowledge.entity';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { mockRepo } from '../../../test-utils';

describe('ContributionService', () => {
  let service: ContributionService;
  let fileRepo: any;
  let questionRepo: any;
  let kpRepo: any;
  let qkRepo: any;

  function mockFile(id: string, uploaderId: string, overrides: any = {}) {
    return { id, uploaderId, filename: 'test.md', subject: '数学', grade: '五年级', fileType: 'md', fileSize: 100, cosUrl: '', status: 'completed', questionCount: 3, errorMsg: null, submitStatus: 'draft', createdAt: new Date(), updatedAt: new Date(), ...overrides };
  }

  function mockQ(id: string, fileId: string, status: string) {
    return { id, sourceFileId: fileId, type: 'single_choice', content: `题目${id}`, options: ['A','B'], answer: 'A', analysis: '', difficulty: 2, subject: '数学', grade: '五年级', status, isDeleted: false, embedding: null, reviewedById: null, reviewedAt: null, createdAt: new Date(), updatedAt: new Date() };
  }

  beforeEach(async () => {
    fileRepo = mockRepo();
    questionRepo = mockRepo();
    kpRepo = mockRepo();
    qkRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributionService,
        { provide: getRepositoryToken(KbFile), useValue: fileRepo },
        { provide: getRepositoryToken(Question), useValue: questionRepo },
        { provide: getRepositoryToken(KnowledgePoint), useValue: kpRepo },
        { provide: getRepositoryToken(QuestionKnowledge), useValue: qkRepo },
      ],
    }).compile();
    service = module.get<ContributionService>(ContributionService);
    jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => { jest.restoreAllMocks(); });

  // ═══════════════════════════════════════════════════════════
  describe('listBatches', () => {
    it('should return teacher batches with stats', async () => {
      const files = [
        mockFile('f1', 'u1', { submitStatus: 'pending_review' }),
        mockFile('f2', 'u1', { submitStatus: 'reviewed' }),
      ];
      fileRepo.createQueryBuilder().getManyAndCount.mockResolvedValue([files, 2]);
      questionRepo.find.mockResolvedValue([
        mockQ('q1','f1','approved'), mockQ('q2','f1','approved'),
        mockQ('q3','f1','rejected'), mockQ('q4','f1','rejected'),
        mockQ('q5','f1','pending_review'),
      ]);
      fileRepo.findOne.mockResolvedValue(mockFile('f1','u1'));

      const result = await service.listBatches('u1', 1, 10);

      expect(result.list).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.list[0].approvedCount).toBe(2);
      expect(result.list[0].rejectedCount).toBe(2);
      expect(result.list[0].pendingCount).toBe(1);
    });

    it('should return empty list for user with no batches', async () => {
      fileRepo.createQueryBuilder().getManyAndCount.mockResolvedValue([[], 0]);
      const result = await service.listBatches('u99', 1, 10);
      expect(result.list).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════
  describe('getBatchDetail', () => {
    it('should return batch with questions and knowledge points', async () => {
      fileRepo.findOne.mockResolvedValue(mockFile('f1', 'u1'));
      questionRepo.find.mockResolvedValue([
        mockQ('q1','f1','approved'), mockQ('q2','f1','rejected'),
      ]);
      qkRepo.find.mockResolvedValue([
        { questionId: 'q1', knowledgePointId: 'kp1' },
      ]);
      kpRepo.find.mockResolvedValue([
        { id: 'kp1', name: '分数运算' },
      ]);

      const result = await service.getBatchDetail('f1', 'u1');

      expect(result.fileId).toBe('f1');
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].knowledgePoints).toContain('分数运算');
      expect(result.stats.approved).toBe(1);
      expect(result.stats.rejected).toBe(1);
    });

    it('should throw 403 for wrong user', async () => {
      fileRepo.findOne.mockResolvedValue(mockFile('f1', 'u1'));
      await expect(service.getBatchDetail('f1', 'u2')).rejects.toThrow(ForbiddenException);
    });

    it('should throw 404 for non-existent batch', async () => {
      fileRepo.findOne.mockResolvedValue(null);
      await expect(service.getBatchDetail('bad-id', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════
  describe('submitForReview', () => {
    it('should submit batch with parsed questions', async () => {
      fileRepo.findOne.mockResolvedValue(mockFile('f1', 'u1', { submitStatus: 'draft' }));
      questionRepo.update.mockResolvedValue({ affected: 3 });

      const result = await service.submitForReview('f1', 'u1');

      expect(result.submitted).toBe(3);
      expect(questionRepo.update).toHaveBeenCalledWith(
        { sourceFileId: 'f1', status: 'parsed', isDeleted: false },
        { status: 'pending_review' },
      );
      expect(fileRepo.update).toHaveBeenCalledWith('f1', { submitStatus: 'pending_review' });
    });

    it('should throw if already submitted', async () => {
      fileRepo.findOne.mockResolvedValue(mockFile('f1', 'u1', { submitStatus: 'pending_review' }));
      await expect(service.submitForReview('f1', 'u1')).rejects.toThrow(ConflictException);
    });

    it('should throw for wrong user', async () => {
      fileRepo.findOne.mockResolvedValue(mockFile('f1', 'u1'));
      await expect(service.submitForReview('f1', 'u2')).rejects.toThrow(ForbiddenException);
    });
  });
});
