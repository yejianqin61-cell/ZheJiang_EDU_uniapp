/**
 * KnowledgeService 单元测试 — 知识点查找/创建/合并
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { KnowledgeService } from './knowledge.service';
import { KnowledgePoint } from '../../../database/entities/knowledge-point.entity';
import { QuestionKnowledge } from '../../../database/entities/question-knowledge.entity';
import { EmbeddingService } from './embedding.service';
import { mockRepo, mockConfig } from '../../../test-utils';

describe('KnowledgeService', () => {
  let service: KnowledgeService;
  let kpRepo: any;
  let qkRepo: any;
  let embeddingService: any;

  beforeEach(async () => {
    kpRepo = mockRepo({
      find: jest.fn().mockResolvedValue([]),
      increment: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn().mockImplementation((entity: any) =>
        Promise.resolve({ id: 'kp-new-1', ...entity })),
    });
    qkRepo = mockRepo();
    embeddingService = {
      embed: jest.fn().mockResolvedValue(new Array(1536).fill(0.1)),
      embedBatch: jest.fn(),
      cosineSimilarity: jest.fn().mockReturnValue(0.5), // default: below threshold
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: getRepositoryToken(KnowledgePoint), useValue: kpRepo },
        { provide: getRepositoryToken(QuestionKnowledge), useValue: qkRepo },
        { provide: EmbeddingService, useValue: embeddingService },
        { provide: ConfigService, useValue: mockConfig({ 'knowledge.mergeSimilarityThreshold': 0.92 }) },
      ],
    }).compile();

    service = module.get<KnowledgeService>(KnowledgeService);
  });

  // ═══════════════════════════════════════════════════════════
  // findOrCreate
  // ═══════════════════════════════════════════════════════════

  describe('findOrCreate', () => {
    it('should create new knowledge point when no candidates', async () => {
      const id = await service.findOrCreate('加法运算', '数学', '五年级');

      expect(id).toBe('kp-new-1');
      expect(kpRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        name: '加法运算',
        subject: '数学',
        grade: '五年级',
        questionCount: 1,
      }));
    });

    it('should merge when similarity >= threshold (0.92)', async () => {
      embeddingService.cosineSimilarity.mockReturnValue(0.95); // high similarity
      kpRepo.find.mockResolvedValue([
        { id: 'kp-existing', name: '加法', subject: '数学', grade: '五年级', embedding: [0.1, 0.2, 0.3], questionCount: 5 },
      ]);

      const id = await service.findOrCreate('加法运算', '数学', '五年级');

      expect(id).toBe('kp-existing');
      expect(kpRepo.increment).toHaveBeenCalledWith({ id: 'kp-existing' }, 'questionCount', 1);
      expect(kpRepo.save).not.toHaveBeenCalled();
    });

    it('should create new KP when similarity below threshold', async () => {
      embeddingService.cosineSimilarity.mockReturnValue(0.80); // below 0.92
      kpRepo.find.mockResolvedValue([
        { id: 'kp-1', name: '几何', subject: '数学', grade: '五年级', embedding: [0.1, 0.2, 0.3], questionCount: 3 },
      ]);

      const id = await service.findOrCreate('加法运算', '数学', '五年级');

      expect(id).toBe('kp-new-1');
      expect(kpRepo.save).toHaveBeenCalled();
    });

    it('should pick best match among multiple candidates', async () => {
      embeddingService.cosineSimilarity
        .mockReturnValueOnce(0.85)  // candidate 1
        .mockReturnValueOnce(0.94); // candidate 2 — best match

      kpRepo.find.mockResolvedValue([
        { id: 'kp-1', name: '知识点A', subject: '数学', grade: '五年级', embedding: [0.1], questionCount: 2 },
        { id: 'kp-2', name: '知识点B', subject: '数学', grade: '五年级', embedding: [0.9], questionCount: 3 },
      ]);

      const id = await service.findOrCreate('新知识点', '数学', '五年级');

      expect(id).toBe('kp-2'); // highest similarity
    });

    it('should skip candidates without embedding', async () => {
      kpRepo.find.mockResolvedValue([
        { id: 'kp-1', name: '无向量知识点', subject: '数学', grade: '五年级', embedding: null, questionCount: 1 },
      ]);
      embeddingService.cosineSimilarity.mockReturnValue(0.95);

      const id = await service.findOrCreate('新知识点', '数学', '五年级');

      // No embedding to compare → create new
      expect(id).toBe('kp-new-1');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // associateQuestion
  // ═══════════════════════════════════════════════════════════

  describe('associateQuestion', () => {
    it('should create question-knowledge association', async () => {
      await service.associateQuestion('q-1', 'kp-1', 1.0);

      expect(qkRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        questionId: 'q-1',
        knowledgePointId: 'kp-1',
        confidence: 1.0,
      }));
    });

    it('should allow confidence less than 1.0', async () => {
      await service.associateQuestion('q-2', 'kp-1', 0.75);

      expect(qkRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        confidence: 0.75,
      }));
    });
  });

  // ═══════════════════════════════════════════════════════════
  // listKnowledgePoints
  // ═══════════════════════════════════════════════════════════

  describe('listKnowledgePoints', () => {
    it('should return paginated results', async () => {
      const mockQb = kpRepo.createQueryBuilder();
      mockQb.getManyAndCount.mockResolvedValue([
        [{ id: 'kp-1', name: '加法', subject: '数学', grade: '五年级', questionCount: 5, createdAt: new Date() }],
        1,
      ]);

      const result = await service.listKnowledgePoints({ page: 1, pageSize: 20 });

      expect(result.list).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by subject', async () => {
      kpRepo.createQueryBuilder().getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.listKnowledgePoints(
        { page: 1, pageSize: 20 }, '数学',
      );

      expect(result.list).toEqual([]);
    });

    it('should filter by keyword', async () => {
      kpRepo.createQueryBuilder().getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.listKnowledgePoints(
        { page: 1, pageSize: 20 }, undefined, undefined, '方程',
      );

      expect(result.pagination.total).toBe(0);
    });
  });
});
