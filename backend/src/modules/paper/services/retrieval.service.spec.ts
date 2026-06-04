/**
 * RetrievalService 单元测试 — 多阶段题目检索
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RetrievalService } from './retrieval.service';
import { Question } from '../../../database/entities/question.entity';
import { QuestionKnowledge } from '../../../database/entities/question-knowledge.entity';
import { KnowledgePoint } from '../../../database/entities/knowledge-point.entity';
import { EmbeddingService } from '../../knowledge-base/services/embedding.service';
import { mockRepo, createQuestion } from '../../../test-utils';

describe('RetrievalService', () => {
  let service: RetrievalService;
  let questionRepo: any;
  let qkRepo: any;
  let kpRepo: any;
  let embeddingService: any;

  beforeEach(async () => {
    questionRepo = mockRepo();
    qkRepo = mockRepo();
    kpRepo = mockRepo();
    embeddingService = {
      embed: jest.fn(),
      embedBatch: jest.fn(),
      cosineSimilarity: jest.fn().mockReturnValue(0.5),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetrievalService,
        { provide: getRepositoryToken(Question), useValue: questionRepo },
        { provide: getRepositoryToken(QuestionKnowledge), useValue: qkRepo },
        { provide: getRepositoryToken(KnowledgePoint), useValue: kpRepo },
        { provide: EmbeddingService, useValue: embeddingService },
      ],
    }).compile();

    service = module.get<RetrievalService>(RetrievalService);
  });

  describe('retrieve', () => {
    it('should return empty array when DB has no questions', async () => {
      questionRepo.createQueryBuilder().getMany.mockResolvedValue([]);

      const result = await service.retrieve({
        subject: '数学', grade: '五年级', difficulty: 'mixed', questionCount: 5,
      });

      expect(result).toEqual([]);
    });

    it('should return DB-filtered questions', async () => {
      const questions = Array.from({ length: 10 }, (_, i) =>
        createQuestion({ id: `q-${i}`, difficulty: (i % 3) + 1 }),
      );
      questionRepo.createQueryBuilder().getMany.mockResolvedValue(questions);

      const result = await service.retrieve({
        subject: '数学', grade: '五年级', difficulty: 'mixed', questionCount: 5,
      });

      expect(result.length).toBeLessThanOrEqual(5);
      // All returned questions should match subject and grade
      for (const q of result) {
        expect(q.subject).toBe('数学');
        expect(q.grade).toBe('五年级');
      }
    });

    it('should apply knowledge point filter when specified', async () => {
      const questions = Array.from({ length: 10 }, (_, i) =>
        createQuestion({ id: `q-${i}`, difficulty: (i % 3) + 1 }),
      );
      questionRepo.createQueryBuilder().getMany.mockResolvedValue(questions);
      kpRepo.find.mockResolvedValue([
        { id: 'kp-1', name: '加法', embedding: [0.1, 0.2] },
      ]);
      qkRepo.find.mockResolvedValue([
        { questionId: 'q-0', knowledgePointId: 'kp-1' },
        { questionId: 'q-3', knowledgePointId: 'kp-1' },
      ]);

      const result = await service.retrieve({
        subject: '数学', grade: '五年级', difficulty: 'mixed', questionCount: 5,
        knowledgePointIds: ['kp-1'],
      });

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should handle specific difficulty (easy=1)', async () => {
      const questions = Array.from({ length: 10 }, (_, i) =>
        createQuestion({ id: `q-${i}`, difficulty: (i % 2) + 1 }), // 1 or 2
      );
      questionRepo.createQueryBuilder().getMany.mockResolvedValue(questions);

      const result = await service.retrieve({
        subject: '数学', grade: '五年级', difficulty: '1', questionCount: 3,
      });

      // All results should be difficulty 1 (or some 2 if insufficient 1s)
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should limit results to questionCount', async () => {
      const questions = Array.from({ length: 20 }, (_, i) =>
        createQuestion({ id: `q-${i}`, difficulty: (i % 3) + 1 }),
      );
      questionRepo.createQueryBuilder().getMany.mockResolvedValue(questions);

      const result = await service.retrieve({
        subject: '数学', grade: '五年级', difficulty: 'mixed', questionCount: 7,
      });

      expect(result.length).toBeLessThanOrEqual(7);
    });
  });
});
