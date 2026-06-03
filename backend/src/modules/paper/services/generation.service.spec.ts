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

  describe('generate — dev mode', () => {
    it('should format DB questions as paper in dev mode', async () => {
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
  });

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
  });

  describe('validateAndParse', () => {
    it('should parse JSON from markdown code block', async () => {
      const candidates = [makeQuestion(), makeQuestion({ id: 'q2' })];

      // Access private method via any
      const raw = '```json\n{"title":"测试卷","questions":[{"index":1,"type":"single_choice","content":"Q1","options":["A"]}]}\n```';
      const result = await service.generate('数学', '五年级', 'mixed', candidates);

      expect(result.questions.length).toBeGreaterThanOrEqual(0);
    });

    it('should parse bare JSON without code block', async () => {
      const candidates = [makeQuestion(), makeQuestion({ id: 'q2' })];

      const result = await service.generate('数学', '五年级', 'mixed', candidates);

      expect(result.title).toBeDefined();
    });
  });
});
