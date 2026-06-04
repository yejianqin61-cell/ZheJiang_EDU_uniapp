/**
 * SplitterService 单元测试 — 题目切分服务
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SplitterService } from './splitter.service';
import { mockConfig } from '../../../test-utils';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SplitterService', () => {
  let service: SplitterService;

  function createService(llmConfig: Record<string, string> = {}) {
    return new SplitterService(mockConfig(llmConfig) as any);
  }

  // ═══════════════════════════════════════════════════════════
  // split — LLM mode
  // ═══════════════════════════════════════════════════════════

  describe('split — LLM mode', () => {
    beforeEach(() => {
      mockedAxios.post = jest.fn();
    });

    it('should return parsed questions from LLM JSON response', async () => {
      service = createService({
        'llm.primary.apiUrl': 'https://api.llm.example.com/v1/chat',
        'llm.primary.apiKey': 'test-api-key',
        'llm.primary.model': 'qwen-plus-latest',
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: '["题目1：1+1=？", "题目2：2+2=？"]' } }],
        },
      });

      const result = await service.split('题目1：1+1=？\n题目2：2+2=？');

      expect(result).toEqual(['题目1：1+1=？', '题目2：2+2=？']);
    });

    it('should parse JSON array from markdown code block', async () => {
      service = createService({
        'llm.primary.apiUrl': 'https://api.llm.example.com',
        'llm.primary.apiKey': 'test-key',
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: '```json\n["题1", "题2", "题3"]\n```' } }],
        },
      });

      const result = await service.split('raw text');

      expect(result).toEqual(['题1', '题2', '题3']);
    });

    it('should return empty array when LLM returns empty JSON', async () => {
      service = createService({
        'llm.primary.apiUrl': 'https://api.llm.example.com',
        'llm.primary.apiKey': 'test-key',
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: '[]' } }],
        },
      });

      const result = await service.split('some text');

      expect(result).toEqual([]);
    });

    it('should return empty array when LLM returns non-JSON', async () => {
      service = createService({
        'llm.primary.apiUrl': 'https://api.llm.example.com',
        'llm.primary.apiKey': 'test-key',
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'I cannot parse this' } }],
        },
      });

      const result = await service.split('text');

      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // split — Regex fallback
  // ═══════════════════════════════════════════════════════════

  describe('split — regex fallback', () => {
    it('should split by "N." pattern (数字+点)', async () => {
      service = createService(); // no apiKey → regex fallback

      const result = await service.split('1.第一题\n2.第二题\n3.第三题');

      expect(result).toEqual(['1.第一题', '2.第二题', '3.第三题']);
    });

    it('should split by "N、" pattern (中文顿号)', async () => {
      service = createService();

      const result = await service.split('1、题目一\n2、题目二');

      expect(result).toEqual(['1、题目一', '2、题目二']);
    });

    it('should split by "(N)" pattern (括号编号)', async () => {
      service = createService();

      const result = await service.split('(1)题目A\n(2)题目B');

      expect(result).toEqual(['(1)题目A', '(2)题目B']);
    });

    it('should merge multi-line questions', async () => {
      service = createService();

      const text = '1.第一题\n选项A\n选项B\n2.第二题';
      const result = await service.split(text);

      expect(result).toEqual(['1.第一题\n选项A\n选项B', '2.第二题']);
    });

    it('should skip empty lines', async () => {
      service = createService();

      const result = await service.split('1.题目\n\n\n2.题目二');

      expect(result).toEqual(['1.题目', '2.题目二']);
    });

    it('should throw error for empty text', async () => {
      service = createService();

      await expect(service.split('')).rejects.toThrow('Empty text');
    });

    it('should throw error for whitespace-only text', async () => {
      service = createService();

      await expect(service.split('  \n  \n  ')).rejects.toThrow('Empty text');
    });
  });
});
