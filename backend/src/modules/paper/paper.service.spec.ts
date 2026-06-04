/**
 * PaperService 单元测试 (增强版: 12 tests → from 4)
 */
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
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PaperService', () => {
  let service: PaperService;
  let questionRepo: any;
  let generationService: any;
  let paperRepo: any;
  let snapshotRepo: any;
  let kpRepo: any;
  let qkRepo: any;

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
    qkRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getRawMany: jest.fn().mockResolvedValue([]),
      }),
    };
    kpRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    paperRepo = {
      findOne: jest.fn(), save: jest.fn().mockImplementation((d: any) => Promise.resolve({ id: 'paper-new', ...d })),
      create: jest.fn((d: any) => ({ id: 'paper-new', ...d })), update: jest.fn(), count: jest.fn().mockResolvedValue(2), find: jest.fn().mockResolvedValue([]),
    };
    snapshotRepo = { find: jest.fn().mockResolvedValue([]), save: jest.fn(), create: jest.fn((d: any) => ({ ...d })) };

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
        { provide: getRepositoryToken(Paper), useValue: paperRepo },
        { provide: getRepositoryToken(PaperQuestionSnapshot), useValue: snapshotRepo },
        { provide: getRepositoryToken(Question), useValue: questionRepo },
        { provide: getRepositoryToken(KnowledgePoint), useValue: kpRepo },
        { provide: getRepositoryToken(QuestionKnowledge), useValue: qkRepo },
        { provide: RetrievalService, useValue: { retrieve: jest.fn() } },
        { provide: GenerationService, useValue: generationService },
        { provide: ConfigService, useValue: { get: jest.fn((k: string, d: any) => d) } },
      ],
    }).compile();

    service = module.get<PaperService>(PaperService);
  });

  // ── generate ──

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

    it('should filter by knowledge points when specified', async () => {
      const candidates = Array.from({ length: 10 }, (_, i) =>
        makeQuestion({ id: `q${i}`, difficulty: 1 }),
      );
      questionRepo.createQueryBuilder().getMany.mockResolvedValue(candidates);
      qkRepo.find.mockResolvedValue([{ questionId: 'q0' }, { questionId: 'q2' }]);

      await service.generate('user1', {
        subject: '数学', grade: '五年级', difficulty: 'mixed', questionCount: 2,
        knowledgePointIds: ['kp-1'],
      });

      expect(qkRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: { knowledgePointId: expect.anything() },
      }));
    });

    it('should throw when knowledge point filter yields no matches', async () => {
      questionRepo.createQueryBuilder().getMany.mockResolvedValue([
        makeQuestion({ id: 'q0' }), makeQuestion({ id: 'q1' }),
      ]);
      qkRepo.find.mockResolvedValue([{ questionId: 'q999' }]); // no candidate matches

      await expect(
        service.generate('user1', { subject: '数学', grade: '五年级', difficulty: 'mixed', questionCount: 2, knowledgePointIds: ['kp-1'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should save paper and snapshots on success', async () => {
      const candidates = Array.from({ length: 10 }, (_, i) =>
        makeQuestion({ id: `q${i}`, difficulty: (i % 3) + 1 }),
      );
      questionRepo.createQueryBuilder().getMany.mockResolvedValue(candidates);

      await service.generate('user1', {
        subject: '数学', grade: '五年级', difficulty: 'mixed', questionCount: 5,
      });

      expect(paperRepo.save).toHaveBeenCalled();
      expect(snapshotRepo.save).toHaveBeenCalled();
      const savedSnapshots = snapshotRepo.save.mock.calls[0][0];
      expect(savedSnapshots).toHaveLength(5);
    });
  });

  // ── getConfigOptions ──

  describe('getConfigOptions', () => {
    it('should return grades, subjects, difficulties', () => {
      const opts = service.getConfigOptions();
      expect(opts.grades).toHaveLength(3);
      expect(opts.subjects).toContain('数学');
      expect(opts.subjects).toHaveLength(9);
      expect(opts.difficulties).toHaveLength(4);
    });
  });

  // ── getKnowledgePoints ──

  describe('getKnowledgePoints', () => {
    it('should query by subject and grade', async () => {
      kpRepo.find.mockResolvedValue([{ id: 'kp-1', name: '加法', questionCount: 5 }]);
      const result = await service.getKnowledgePoints('数学', '五年级');
      expect(result).toHaveLength(1);
      expect(kpRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: { subject: '数学', grade: '五年级' },
      }));
    });
  });

  // ── getPaperById ──

  describe('getPaperById', () => {
    it('should return desensitized questions for draft paper', async () => {
      paperRepo.findOne.mockResolvedValue({ id: 'paper-1', userId: 'u1', title: '测试卷', status: 'draft', totalScore: 25 });
      snapshotRepo.find.mockResolvedValue([
        { sortOrder: 1, snapshot: { type: 'single_choice', content: 'Q1', options: ['A','B'], answer: 'A', analysis: '解析', difficulty: 1, score: 5 } },
      ]);

      const result = await service.getPaperById('paper-1', 'u1');

      expect((result.questions[0] as any).answer).toBeUndefined();
      expect((result.questions[0] as any).analysis).toBeUndefined();
      expect(result.totalScore).toBeUndefined();
    });

    it('should return full questions for paid paper', async () => {
      paperRepo.findOne.mockResolvedValue({ id: 'paper-1', userId: 'u1', title: '测试卷', status: 'paid', totalScore: 25 });
      snapshotRepo.find.mockResolvedValue([
        { sortOrder: 1, snapshot: { type: 'single_choice', content: 'Q1', options: ['A','B'], answer: 'A', analysis: '解析', difficulty: 1, score: 5 } },
      ]);

      const result = await service.getPaperById('paper-1', 'u1');

      expect((result.questions[0] as any).answer).toBe('A');
      expect((result.questions[0] as any).analysis).toBe('解析');
      expect(result.totalScore).toBe(25);
    });

    it('should throw NotFoundException when paper not found', async () => {
      paperRepo.findOne.mockResolvedValue(null);
      await expect(service.getPaperById('bad-id', 'u1'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── applyDifficultyFilter (via generate) ──

  describe('applyDifficultyFilter', () => {
    it('should work with mixed difficulty', async () => {
      const candidates = Array.from({ length: 10 }, (_, i) =>
        makeQuestion({ id: `q${i}`, difficulty: (i % 3) + 1 }),
      );
      questionRepo.createQueryBuilder().getMany.mockResolvedValue(candidates);

      const result = await service.generate('user1', {
        subject: '数学', grade: '五年级', difficulty: 'mixed', questionCount: 3,
      });

      expect(result.questions.length).toBeLessThanOrEqual(3);
    });

    it('should filter by specific difficulty (easy=1)', async () => {
      // 5 easy + 5 hard, request 3 easy
      const candidates = [
        ...Array.from({ length: 5 }, (_, i) => makeQuestion({ id: `easy${i}`, difficulty: 1 })),
        ...Array.from({ length: 5 }, (_, i) => makeQuestion({ id: `hard${i}`, difficulty: 3 })),
      ];
      questionRepo.createQueryBuilder().getMany.mockResolvedValue(candidates);

      await service.generate('user1', {
        subject: '数学', grade: '五年级', difficulty: '1', questionCount: 3,
      });

      // Should succeed (enough easy questions)
      expect(paperRepo.save).toHaveBeenCalled();
    });
  });
});
