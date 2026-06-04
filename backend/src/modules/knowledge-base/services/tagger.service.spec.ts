/**
 * TaggerService 单元测试 — AI 题目解析与标注
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { TaggerService } from './tagger.service';
import { Question } from '../../../database/entities/question.entity';
import { mockRepo, mockConfig } from '../../../test-utils';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TaggerService', () => {
  let service: TaggerService;
  let questionRepo: any;

  function createService(llmConfig: Record<string, string> = {}) {
    questionRepo = mockRepo({
      save: jest.fn().mockImplementation((entity: any) =>
        Promise.resolve({ id: 'q-new-1', ...entity })),
    });
    return new TaggerService(
      questionRepo as any,
      mockConfig(llmConfig) as any,
    );
  }

  // ═══════════════════════════════════════════════════════════
  // tagQuestion — LLM mode
  // ═══════════════════════════════════════════════════════════

  describe('tagQuestion — LLM mode', () => {
    beforeEach(() => {
      mockedAxios.post = jest.fn();
    });

    it('should parse question via LLM and save', async () => {
      service = createService({
        'llm.primary.apiUrl': 'https://api.llm.example.com',
        'llm.primary.apiKey': 'test-key',
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                type: 'single_choice',
                options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'],
                answer: 'B',
                analysis: '1+1=2',
                difficulty: 1,
              }),
            },
          }],
        },
      });

      const result = await service.tagQuestion('1+1=?', '数学', '一年级', 'file-1');

      expect(result.type).toBe('single_choice');
      expect(result.answer).toBe('B');
      expect(result.difficulty).toBe(1);
      expect(result.status).toBe('parsed');
      expect(questionRepo.save).toHaveBeenCalled();
    });

    it('should use defaults when LLM returns incomplete JSON', async () => {
      service = createService({
        'llm.primary.apiUrl': 'https://api.llm.example.com',
        'llm.primary.apiKey': 'test-key',
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: '{"type":"single_choice"}' } }],
        },
      });

      const result = await service.tagQuestion('question text', '数学', '一年级', 'file-1');

      expect(result.type).toBe('single_choice');
      expect(result.options).toEqual([]);
      expect(result.answer).toBe('');
      expect(result.analysis).toBe('');
      expect(result.difficulty).toBe(2); // default
    });
  });

  // ═══════════════════════════════════════════════════════════
  // tagQuestion — Heuristic fallback
  // ═══════════════════════════════════════════════════════════

  describe('tagQuestion — heuristic fallback', () => {
    it('should detect single_choice from ABCD options', async () => {
      service = createService(); // no LLM config

      const result = await service.tagQuestion(
        '1+1=?\nA. 1\nB. 2\nC. 3\nD. 4', '数学', '一年级', 'file-1',
      );

      expect(result.type).toBe('single_choice');
      expect(result.options).toHaveLength(4);
    });

    it('should detect true_false from 对/错', async () => {
      service = createService();

      const result = await service.tagQuestion(
        '1+1=3 是对还是错？', '数学', '一年级', 'file-1',
      );

      expect(result.type).toBe('true_false');
    });

    it('should detect fill_blank from blank markers', async () => {
      service = createService();

      const result = await service.tagQuestion(
        '1 + 1 = (   )', '数学', '一年级', 'file-1',
      );

      expect(result.type).toBe('fill_blank');
    });

    it('should default to short_answer for unmarked text', async () => {
      service = createService();

      const result = await service.tagQuestion(
        '请简述加法的定义', '数学', '一年级', 'file-1',
      );

      expect(result.type).toBe('short_answer');
    });

    it('should assign difficulty based on text length', async () => {
      service = createService();

      const short = await service.tagQuestion('短文本', '数学', '一年级', 'file-1');
      expect(short.difficulty).toBe(1); // < 80 chars

      const medium = await service.tagQuestion('中'.repeat(100), '数学', '一年级', 'file-1');
      expect(medium.difficulty).toBe(2); // 80-199 chars

      const long = await service.tagQuestion('长'.repeat(250), '数学', '一年级', 'file-1');
      expect(long.difficulty).toBe(3); // >= 200 chars
    });
  });

  // ═══════════════════════════════════════════════════════════
  // identifyKnowledgePoints — LLM mode
  // ═══════════════════════════════════════════════════════════

  describe('identifyKnowledgePoints — LLM mode', () => {
    it('should return knowledge points from LLM', async () => {
      service = createService({
        'llm.primary.apiUrl': 'https://api.llm.example.com',
        'llm.primary.apiKey': 'test-key',
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: '["加法运算", "整数计算"]' } }],
        },
      });

      const kps = await service.identifyKnowledgePoints('1+1=?', '数学', '一年级');

      expect(kps).toEqual(['加法运算', '整数计算']);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // identifyKnowledgePoints — Heuristic fallback
  // ═══════════════════════════════════════════════════════════

  describe('identifyKnowledgePoints — heuristic fallback', () => {
    it('should match math keywords', async () => {
      service = createService();

      const kps = await service.identifyKnowledgePoints('解方程 2x+3=7', '数学', '五年级');

      expect(kps).toContain('方程');
    });

    it('should return default keyword when no match', async () => {
      service = createService();

      const kps = await service.identifyKnowledgePoints('这是一道题目', '物理', '八年级');

      expect(kps).toEqual(['基础知识']); // 物理不在keywords表中
    });

    it('should return at most 2 keywords', async () => {
      service = createService();

      const kps = await service.identifyKnowledgePoints(
        '计算方程几何函数概率统计', '数学', '五年级',
      );

      expect(kps.length).toBeLessThanOrEqual(2);
    });
  });
});
