/**
 * EmbeddingService 单元测试 — 文本嵌入向量化
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from './embedding.service';
import { mockConfig } from '../../../test-utils';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  function createService(config: Record<string, string> = {}) {
    return new EmbeddingService(mockConfig({
      'llm.embedding.dimension': '1536',
      'llm.embedding.apiUrl': '',
      'llm.embedding.apiKey': '',
      'llm.embedding.model': 'text-embedding-v4',
      ...config,
    }) as any);
  }

  // ═══════════════════════════════════════════════════════════
  // embed — remote mode
  // ═══════════════════════════════════════════════════════════

  describe('embed — remote mode', () => {
    beforeEach(() => {
      mockedAxios.post = jest.fn();
    });

    it('should return embedding vector from remote API', async () => {
      service = createService({
        'llm.embedding.apiUrl': 'https://api.llm.example.com/embeddings',
        'llm.embedding.apiKey': 'test-key',
      });

      mockedAxios.post.mockResolvedValue({
        data: { data: [{ embedding: new Array(1536).fill(0.1) }] },
      });

      const result = await service.embed('test text');

      expect(result).toHaveLength(1536);
      expect(result[0]).toBe(0.1);
    });

    it('should return empty array on API error', async () => {
      service = createService({
        'llm.embedding.apiUrl': 'https://api.llm.example.com',
        'llm.embedding.apiKey': 'test-key',
      });

      mockedAxios.post.mockRejectedValue(new Error('Network Error'));

      await expect(service.embed('text')).rejects.toThrow('Network Error');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // embed — fallback mode
  // ═══════════════════════════════════════════════════════════

  describe('embed — fallback mode', () => {
    it('should return deterministic pseudo-embedding', async () => {
      service = createService();

      const v1 = await service.embed('hello');
      const v2 = await service.embed('hello');

      expect(v1).toHaveLength(1536);
      expect(v2).toHaveLength(1536);
      // Same text → same vector (deterministic)
      expect(v1).toEqual(v2);
    });

    it('should produce different vectors for different texts', async () => {
      service = createService();

      const v1 = await service.embed('数学题');
      const v2 = await service.embed('英语题');

      // Different texts should produce different vectors
      const isDifferent = v1.some((val, i) => val !== v2[i]);
      expect(isDifferent).toBe(true);
    });

    it('should return normalized vectors (unit length)', async () => {
      service = createService();

      const v = await service.embed('test');

      // Norm ≈ 1.0 for normalized vector
      const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
      expect(norm).toBeCloseTo(1.0, 5);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // embedBatch
  // ═══════════════════════════════════════════════════════════

  describe('embedBatch', () => {
    it('should embed multiple texts concurrently', async () => {
      service = createService();

      const results = await service.embedBatch(['text1', 'text2', 'text3']);

      expect(results).toHaveLength(3);
      expect(results[0]).toHaveLength(1536);
      expect(results[1]).toHaveLength(1536);
      expect(results[2]).toHaveLength(1536);
    });

    it('should return empty array for empty input', async () => {
      service = createService();

      const results = await service.embedBatch([]);

      expect(results).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // cosineSimilarity
  // ═══════════════════════════════════════════════════════════

  describe('cosineSimilarity', () => {
    it('should return 1.0 for identical vectors', () => {
      service = createService();
      const v = [1, 2, 3];

      expect(service.cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
    });

    it('should return 0.0 for orthogonal vectors', () => {
      service = createService();

      expect(service.cosineSimilarity([1, 0], [0, 1])).toBe(0);
    });

    it('should return 0.0 for different dimension vectors', () => {
      service = createService();

      expect(service.cosineSimilarity([1, 2, 3], [1, 2])).toBe(0);
    });

    it('should return 0.0 for zero vectors', () => {
      service = createService();

      expect(service.cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
    });

    it('should compute correct cosine for known vectors', () => {
      service = createService();

      // cos = (1*4+2*5+3*6) / (sqrt(1+4+9)*sqrt(16+25+36))
      // = (4+10+18) / (sqrt(14)*sqrt(77)) = 32 / 32.83 ≈ 0.9746
      const sim = service.cosineSimilarity([1, 2, 3], [4, 5, 6]);
      expect(sim).toBeCloseTo(0.9746, 3);
    });
  });
});
