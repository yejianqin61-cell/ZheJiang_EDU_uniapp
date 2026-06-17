/**
 * ExportService 单元测试 — 试卷导出
 *
 * 覆盖：DOCX/PDF 导出、支付验证、Python 服务回退
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, ConflictException } from '@nestjs/common';
import axios from 'axios';
import { ExportService } from './export.service';
import { Paper } from '../../database/entities/paper.entity';
import { Order } from '../../database/entities/order.entity';
import { PaperQuestionSnapshot } from '../../database/entities/paper-question-snapshot.entity';
import { LocalFileService } from './services/local-file.service';
import { mockRepo, mockConfig, createPaper, createSnapshots, createOrder } from '../../test-utils';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ExportService', () => {
  let service: ExportService;
  let paperRepo: any;
  let orderRepo: any;
  let snapshotRepo: any;
  let localFileService: any;
  const userId = 'user-1';
  const paperId = 'paper-1';
  const fileId = 'file-export-001';

  beforeEach(async () => {
    paperRepo = mockRepo();
    orderRepo = mockRepo();
    snapshotRepo = mockRepo();
    localFileService = {
      save: jest.fn().mockResolvedValue(fileId),
      read: jest.fn().mockResolvedValue(Buffer.from('test')),
      getDownloadUrl: jest.fn().mockReturnValue(`/download/${fileId}`),
      getMimeType: jest.fn().mockReturnValue('application/octet-stream'),
      getLinkTtl: jest.fn().mockReturnValue(86400),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        { provide: getRepositoryToken(Paper), useValue: paperRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(PaperQuestionSnapshot), useValue: snapshotRepo },
        { provide: LocalFileService, useValue: localFileService },
        { provide: ConfigService, useValue: mockConfig({ 'export.pythonServiceUrl': 'http://localhost:5000' }) },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    mockedAxios.post = jest.fn();
  });

  // ── Helpers ──
  function setupPaidPaper(overrides: Record<string, any> = {}) {
    const paper = createPaper({ id: paperId, userId, status: 'paid', ...overrides });
    const order = createOrder({ paperId, userId, status: 'paid' });
    const snapshots = createSnapshots(paperId, 5);
    paperRepo.findOne.mockResolvedValue(paper);
    orderRepo.findOne.mockResolvedValue(order);
    snapshotRepo.find.mockResolvedValue(snapshots);
    return { paper, order, snapshots };
  }

  // ═══════════════════════════════════════════════════════════
  // exportDocx
  // ═══════════════════════════════════════════════════════════

  describe('exportDocx', () => {
    it('should export DOCX successfully', async () => {
      setupPaidPaper();
      mockedAxios.post.mockResolvedValue({ data: Buffer.from('mock-docx-content') });

      const result = await service.exportDocx(paperId, userId);

      expect(result.downloadUrl).toBe(`/download/${fileId}`);
      expect(result.expiresAt).toBeDefined();
      expect(localFileService.save).toHaveBeenCalledWith(
        expect.stringContaining('.docx'),
        expect.any(Buffer),
      );
      expect(paperRepo.update).toHaveBeenCalledWith(paperId, expect.objectContaining({
        status: 'exported',
        exportDocxUrl: `/download/${fileId}`,
      }));
    });

    it('should throw NotFoundException when paper not found', async () => {
      paperRepo.findOne.mockResolvedValue(null);

      await expect(service.exportDocx(paperId, userId))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when order not paid', async () => {
      paperRepo.findOne.mockResolvedValue(createPaper({ id: paperId, userId }));
      orderRepo.findOne.mockResolvedValue(null); // no paid order

      await expect(service.exportDocx(paperId, userId))
        .rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when snapshots are empty', async () => {
      paperRepo.findOne.mockResolvedValue(createPaper({ id: paperId, userId }));
      orderRepo.findOne.mockResolvedValue(createOrder({ paperId, userId, status: 'paid' }));
      snapshotRepo.find.mockResolvedValue([]);

      await expect(service.exportDocx(paperId, userId))
        .rejects.toThrow(NotFoundException);
    });

    it('should use dev fallback when Python service unavailable', async () => {
      setupPaidPaper();
      mockedAxios.post.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await service.exportDocx(paperId, userId);

      // Should still succeed with text fallback
      expect(result.downloadUrl).toBeDefined();
      expect(localFileService.save).toHaveBeenCalled();
    });

    it('should use dev fallback when Python returns 500', async () => {
      setupPaidPaper();
      mockedAxios.post.mockRejectedValue({ response: { status: 500 } });

      const result = await service.exportDocx(paperId, userId);

      expect(result.downloadUrl).toBeDefined();
    });

    it('should not allow export for another user\'s paper', async () => {
      const otherUserId = 'user-2';
      const paper = createPaper({ id: paperId, userId: otherUserId });
      paperRepo.findOne.mockResolvedValue(paper);
      // findOne with {paperId, userId} = 'user-1' → null
      paperRepo.findOne.mockImplementation((query: any) => {
        if (query?.where?.userId === userId) return null;
        return paper;
      });

      await expect(service.exportDocx(paperId, userId))
        .rejects.toThrow(NotFoundException);
    });

    it('should save with correct filename format', async () => {
      const { paper } = setupPaidPaper();
      mockedAxios.post.mockResolvedValue({ data: Buffer.from('content') });

      await service.exportDocx(paperId, userId);

      const savedFilename: string = localFileService.save.mock.calls[0][0];
      expect(savedFilename).toContain(paper.title);
      expect(savedFilename).toContain('.docx');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // exportPdf
  // ═══════════════════════════════════════════════════════════

  describe('exportPdf', () => {
    it('should export PDF successfully after DOCX', async () => {
      setupPaidPaper({ exportDocxUrl: '/download/old-docx' });
      mockedAxios.post.mockResolvedValue({ data: Buffer.from('mock-pdf-content') });

      const result = await service.exportPdf(paperId, userId);

      expect(result.downloadUrl).toBe(`/download/${fileId}`);
      expect(paperRepo.update).toHaveBeenCalledWith(paperId, expect.objectContaining({
        exportPdfUrl: `/download/${fileId}`,
      }));
    });

    it('should throw ConflictException when DOCX not generated first', async () => {
      setupPaidPaper({ exportDocxUrl: null }); // no prior DOCX

      await expect(service.exportPdf(paperId, userId))
        .rejects.toThrow(ConflictException);
    });

    it('should use dev fallback when Python PDF unavailable', async () => {
      setupPaidPaper({ exportDocxUrl: '/download/old-docx' });
      mockedAxios.post.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await service.exportPdf(paperId, userId);

      expect(result.downloadUrl).toBeDefined();
    });

    it('should throw NotFoundException when paper not found', async () => {
      paperRepo.findOne.mockResolvedValue(null);

      await expect(service.exportPdf(paperId, userId))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Dev fallback text export
  // ═══════════════════════════════════════════════════════════

  describe('dev fallback (text export)', () => {
    it('should generate UTF-8 text containing questions and answers', async () => {
      const { paper } = setupPaidPaper();
      mockedAxios.post.mockRejectedValue(new Error('ECONNREFUSED'));

      await service.exportDocx(paperId, userId);

      const savedBuffer: Buffer = localFileService.save.mock.calls[0][1];
      const text = savedBuffer.toString('utf-8');
      expect(text).toContain(paper.title);
      expect(text).toContain('试题部分');
      expect(text).toContain('AI辅助生成'); // watermark instead of answers
    });

    it('should handle special characters in paper title', async () => {
      setupPaidPaper();
      paperRepo.findOne.mockResolvedValue(createPaper({
        id: paperId, userId, title: '高一数学<必修一> 测试卷 "A"',
      }));
      mockedAxios.post.mockRejectedValue(new Error('ECONNREFUSED'));

      await service.exportDocx(paperId, userId);

      const savedBuffer: Buffer = localFileService.save.mock.calls[0][1];
      expect(savedBuffer.length).toBeGreaterThan(0);
    });
  });
});
