/**
 * QuestionManageService 单元测试 — 题目管理 CRUD
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { QuestionManageService } from './question-manage.service';
import { Question } from '../../../database/entities/question.entity';
import { QuestionKnowledge } from '../../../database/entities/question-knowledge.entity';
import { KnowledgePoint } from '../../../database/entities/knowledge-point.entity';
import { mockRepo, createQuestion } from '../../../test-utils';

describe('QuestionManageService', () => {
  let service: QuestionManageService;
  let questionRepo: any;
  let qkRepo: any;
  let kpRepo: any;

  beforeEach(async () => {
    questionRepo = mockRepo();
    qkRepo = mockRepo();
    kpRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionManageService,
        { provide: getRepositoryToken(Question), useValue: questionRepo },
        { provide: getRepositoryToken(QuestionKnowledge), useValue: qkRepo },
        { provide: getRepositoryToken(KnowledgePoint), useValue: kpRepo },
      ],
    }).compile();

    service = module.get<QuestionManageService>(QuestionManageService);
  });

  // ═══════════════════════════════════════════════════════════
  // list
  // ═══════════════════════════════════════════════════════════

  describe('list', () => {
    it('should return paginated approved questions', async () => {
      questionRepo.createQueryBuilder().getManyAndCount.mockResolvedValue([
        [createQuestion(), createQuestion({ id: 'q-2', content: '题目2' })],
        2,
      ]);

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.list).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by subject', async () => {
      questionRepo.createQueryBuilder().getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.list({ page: 1, pageSize: 20, subject: '物理' });

      expect(result.list).toEqual([]);
    });

    it('should filter by keyword', async () => {
      questionRepo.createQueryBuilder().getManyAndCount.mockResolvedValue([[createQuestion()], 1]);

      const result = await service.list({ page: 1, pageSize: 20, keyword: '三角形' });

      expect(result.list).toHaveLength(1);
    });

    it('should filter by knowledgePointId', async () => {
      qkRepo.find.mockResolvedValue([{ questionId: 'q-1' }, { questionId: 'q-3' }]);
      questionRepo.createQueryBuilder().getManyAndCount.mockResolvedValue([
        [createQuestion({ id: 'q-1' }), createQuestion({ id: 'q-3' })], 2,
      ]);

      const result = await service.list({ page: 1, pageSize: 20, knowledgePointId: 'kp-1' });

      expect(result.list).toHaveLength(2);
    });

    it('should return empty when knowledgePoint has no questions', async () => {
      qkRepo.find.mockResolvedValue([]);

      const result = await service.list({ page: 1, pageSize: 20, knowledgePointId: 'kp-empty' });

      expect(result.list).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // detail
  // ═══════════════════════════════════════════════════════════

  describe('detail', () => {
    it('should return question with knowledge points', async () => {
      questionRepo.findOne.mockResolvedValue(createQuestion());
      qkRepo.find.mockResolvedValue([
        { knowledgePoint: { id: 'kp-1', name: '加法' }, confidence: 1.0 },
        { knowledgePoint: { id: 'kp-2', name: '整数' }, confidence: 0.8 },
      ]);

      const result = await service.detail('q-1');

      expect(result.id).toBe('q-1');
      expect(result.knowledgePoints).toHaveLength(2);
      expect(result.knowledgePoints[0].name).toBe('加法');
    });

    it('should throw NotFoundException when question not found', async () => {
      questionRepo.findOne.mockResolvedValue(null);

      await expect(service.detail('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });

    it('should handle question with no knowledge points', async () => {
      questionRepo.findOne.mockResolvedValue(createQuestion());
      qkRepo.find.mockResolvedValue([]);

      const result = await service.detail('q-1');

      expect(result.knowledgePoints).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // softDelete / batchDelete / deleteByFile
  // ═══════════════════════════════════════════════════════════

  describe('softDelete', () => {
    it('should soft delete a question', async () => {
      questionRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.softDelete('q-1');

      expect(result.deleted).toBe(true);
      expect(questionRepo.update).toHaveBeenCalledWith(
        { id: 'q-1', isDeleted: false },
        { isDeleted: true },
      );
    });

    it('should throw NotFoundException when question not found', async () => {
      questionRepo.update.mockResolvedValue({ affected: 0 });

      await expect(service.softDelete('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('batchDelete', () => {
    it('should delete multiple questions', async () => {
      questionRepo.update.mockResolvedValue({ affected: 3 });

      const result = await service.batchDelete(['q-1', 'q-2', 'q-3']);

      expect(result.deleted).toBe(3);
    });

    it('should return deleted count even if some not found', async () => {
      questionRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.batchDelete(['q-1', 'nonexistent']);

      expect(result.deleted).toBe(1);
    });
  });

  describe('deleteByFile', () => {
    it('should delete all questions from a file', async () => {
      questionRepo.update.mockResolvedValue({ affected: 5 });

      const result = await service.deleteByFile('file-1');

      expect(result.deleted).toBe(5);
      expect(questionRepo.update).toHaveBeenCalledWith(
        { sourceFileId: 'file-1', isDeleted: false },
        { isDeleted: true },
      );
    });
  });
});
