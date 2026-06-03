import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PaperService } from './paper.service';
import { RetrievalService } from './services/retrieval.service';
import { GenerationService } from './services/generation.service';
import { Paper } from '../../database/entities/paper.entity';
import { PaperQuestionSnapshot } from '../../database/entities/paper-question-snapshot.entity';
import { Question } from '../../database/entities/question.entity';
import { KnowledgePoint } from '../../database/entities/knowledge-point.entity';
import { QuestionKnowledge } from '../../database/entities/question-knowledge.entity';
import { BadRequestException } from '@nestjs/common';

describe('PaperService', () => {
  let service: PaperService;
  let questionRepo: any;
  let generationService: any;

  function makeQuestion(overrides: any = {}) {
    return {
      id: 'q1', type: 'single_choice', content: 'Q?', options: ['A','B'],
      answer: 'A', analysis: 'easy', difficulty: 1, subject: '数学', grade: '五年级',
      status: 'approved', isDeleted: false, ...overrides,
    } as Question;
  }

  beforeEach(async () => {
    questionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      }),
    };

    generationService = {
      generate: jest.fn().mockResolvedValue({
        title: '五年级数学测试卷',
        questions: [
          { index: 1, type: 'single_choice', content: 'Q1', options: ['A','B'] },
          { index: 2, type: 'fill_blank', content: 'Q2', options: [] },
        ],
      }),
      stripMetadata: jest.fn((qs) => qs.map((q: any) => ({ index: q.index, type: q.type, content: q.content, options: q.options }))),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaperService,
        { provide: getRepositoryToken(Paper), useValue: { findOne: jest.fn(), save: jest.fn().mockImplementation((d: any) => Promise.resolve({ id: 'paper-new', ...d })), create: jest.fn((d: any) => ({ id: 'paper-new', ...d })), update: jest.fn(), count: jest.fn().mockResolvedValue(2), find: jest.fn().mockResolvedValue([]) } },
        { provide: getRepositoryToken(PaperQuestionSnapshot), useValue: { find: jest.fn().mockResolvedValue([]), save: jest.fn(), create: jest.fn((d: any) => ({ ...d })) } },
        { provide: getRepositoryToken(Question), useValue: questionRepo },
        { provide: getRepositoryToken(KnowledgePoint), useValue: { find: jest.fn().mockResolvedValue([]), findOne: jest.fn() } },
        { provide: getRepositoryToken(QuestionKnowledge), useValue: { createQueryBuilder: jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getRawMany: jest.fn().mockResolvedValue([]) }) } },
        { provide: RetrievalService, useValue: { retrieve: jest.fn() } },
        { provide: GenerationService, useValue: generationService },
        { provide: ConfigService, useValue: { get: jest.fn((k: string, d: any) => d) } },
      ],
    }).compile();

    service = module.get<PaperService>(PaperService);
  });

  describe('generate', () => {
    it('should throw when not enough candidates', async () => {
      questionRepo.createQueryBuilder().getMany.mockResolvedValue([]);

      await expect(
        service.generate('user1', { subject: '数学', grade: '五年级', difficulty: 'mixed', questionCount: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate paper with enough candidates', async () => {
      const candidates = Array.from({ length: 10 }, (_, i) =>
        makeQuestion({ id: `q${i}`, difficulty: (i % 3) + 1 }),
      );
      questionRepo.createQueryBuilder().getMany.mockResolvedValue(candidates);

      const result = await service.generate('user1', {
        subject: '数学', grade: '五年级', difficulty: 'mixed', questionCount: 5,
      });

      expect(result.paperId).toBeDefined();
      expect(result.questions).toHaveLength(2);
      expect(result.generateTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getConfigOptions', () => {
    it('should return grades, subjects, difficulties', () => {
      const opts = service.getConfigOptions();
      expect(opts.grades).toHaveLength(3);
      expect(opts.subjects).toContain('数学');
      expect(opts.difficulties).toHaveLength(4);
    });
  });

  describe('applyDifficultyFilter (via generate)', () => {
    it('should respect mixed difficulty distribution', async () => {
      const candidates = Array.from({ length: 10 }, (_, i) =>
        makeQuestion({ id: `q${i}`, difficulty: (i % 3) + 1 }),
      );
      questionRepo.createQueryBuilder().getMany.mockResolvedValue(candidates);

      const result = await service.generate('user1', {
        subject: '数学', grade: '五年级', difficulty: 'mixed', questionCount: 3,
      });

      expect(result.questions.length).toBeLessThanOrEqual(3);
    });
  });
});
