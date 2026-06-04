/**
 * GenerationService 单元测试 (增强版: 12 tests → from 5)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GenerationService } from './generation.service';
import { Question } from '../../../database/entities/question.entity';

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q-1', type: 'single_choice', content: '1+1=?',
    options: ['A. 1', 'B. 2'], answer: 'B', analysis: 'basic',
    difficulty: 1, subject: '数学', grade: '五年级',
    status: 'approved', isDeleted: false,
    sourceFileId: null, sourceFile: null,
    questionKnowledge: [], embedding: null,
    reviewedById: null, reviewedBy: null,
    reviewedAt: null, createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  } as Question;
}

describe('GenerationService', () => {
  let service: GenerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'llm.primary.apiUrl') return '';
              if (key === 'llm.primary.apiKey') return '';
              if (key === 'llm.primary.model') return 'qwen-plus-latest';
              if (key === 'llm.fallback.apiUrl') return '';
              if (key === 'llm.fallback.apiKey') return '';
              if (key === 'llm.fallback.model') return 'deepseek-chat';
              if (key === 'llm.timeout') return 20000;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<GenerationService>(GenerationService);
  });

  // ── generate — dev mode ──

  describe('generate — dev mode', () => {
    it('should format DB questions as paper', async () => {
      const candidates = [
        makeQuestion({ id: 'q1', type: 'single_choice', content: '1+1=?', options: ['A.1','B.2'] }),
        makeQuestion({ id: 'q2', type: 'fill_blank', content: '填空', options: [] }),
      ];

      const result = await service.generate('数学', '五年级', 'mixed', candidates);

      expect(result.title).toContain('五年级');
      expect(result.title).toContain('综合练习卷');
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].index).toBe(1);
      expect(result.questions[0].type).toBe('single_choice');
    });

    it('should handle single candidate', async () => {
      const result = await service.generate('数学', '五年级', 'mixed', [makeQuestion()]);
      expect(result.questions).toHaveLength(1);
    });

    it('should include the subject in title', async () => {
      const result = await service.generate('语文', '三年级', 'mixed', [makeQuestion({ subject: '语文', grade: '三年级' })]);
      expect(result.title).toContain('语文');
      expect(result.title).toContain('三年级');
    });
  });

  // ── stripMetadata ──

  describe('stripMetadata', () => {
    it('should only return index/type/content/options', () => {
      const questions = [
        { index: 1, type: 'single_choice', content: 'Q1', options: ['A','B'] },
        { index: 2, type: 'short_answer', content: 'Q2', options: [] },
      ];

      const stripped = service.stripMetadata(questions);

      expect(stripped).toHaveLength(2);
      expect(Object.keys(stripped[0])).toEqual(['index', 'type', 'content', 'options']);
    });

    it('should return empty array for empty input', () => {
      expect(service.stripMetadata([])).toEqual([]);
    });

    it('should not expose answer/analysis/difficulty/score', () => {
      const questions = [{
        index: 1, type: 'single_choice', content: 'Q', options: ['A'],
        answer: 'SECRET', analysis: 'SECRET', difficulty: 3, score: 10,
      }];

      const stripped = service.stripMetadata(questions);

      expect((stripped[0] as any).answer).toBeUndefined();
      expect((stripped[0] as any).analysis).toBeUndefined();
      expect((stripped[0] as any).difficulty).toBeUndefined();
      expect((stripped[0] as any).score).toBeUndefined();
    });
  });

  // ── validateAndParse (via generate in dev mode) ──

  describe('title generation', () => {
    it('should create appropriate title for primary school', async () => {
      const result = await service.generate('英语', '六年级', 'mixed', [makeQuestion()]);
      expect(result.title).toContain('六年级');
    });

    it('should create appropriate title for high school', async () => {
      const result = await service.generate('物理', '高一', 'mixed', [makeQuestion({ subject: '物理', grade: '高一' })]);
      expect(result.title).toContain('高一');
    });
  });
});
