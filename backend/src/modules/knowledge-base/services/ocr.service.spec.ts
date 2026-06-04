/**
 * OCRService 单元测试 — OCR 识别服务
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { OCRService } from './ocr.service';
import { OcrTask } from '../../../database/entities/ocr-task.entity';
import { mockRepo, mockConfig } from '../../../test-utils';

// Mock tesseract.js dynamic require
jest.mock('tesseract.js', () => ({
  recognize: jest.fn(),
}));

describe('OCRService', () => {
  let service: OCRService;
  let ocrTaskRepo: any;
  let Tesseract: any;

  beforeEach(async () => {
    ocrTaskRepo = mockRepo({
      save: jest.fn().mockImplementation((entity: any) =>
        Promise.resolve({ id: 'ocr-task-1', ...entity })),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OCRService,
        { provide: getRepositoryToken(OcrTask), useValue: ocrTaskRepo },
        { provide: ConfigService, useValue: mockConfig({ 'ocr.apiUrl': '' }) },
      ],
    }).compile();

    service = module.get<OCRService>(OCRService);
    Tesseract = require('tesseract.js');
    Tesseract.recognize.mockResolvedValue({
      data: { text: '1+1=?\nA.1 B.2 C.3 D.4' },
    });
  });

  // ═══════════════════════════════════════════════════════════
  // processFile — with image base64 (local OCR)
  // ═══════════════════════════════════════════════════════════

  describe('processFile with image base64', () => {
    it('should create OCR task and run tesseract', async () => {
      const text = await service.processFile('file-1', 'base64imagedata');

      expect(ocrTaskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ fileId: 'file-1', status: 'processing' }),
      );
      expect(Tesseract.recognize).toHaveBeenCalled();
      expect(text).toBe('1+1=?\nA.1 B.2 C.3 D.4');
    });

    it('should update task to completed on success', async () => {
      await service.processFile('file-1', 'base64data');

      expect(ocrTaskRepo.update).toHaveBeenCalledWith('ocr-task-1', expect.objectContaining({
        status: 'completed',
        resultText: expect.any(String),
        durationMs: expect.any(Number),
      }));
    });

    it('should update task to failed on error', async () => {
      Tesseract.recognize.mockRejectedValue(new Error('OCR engine crash'));

      await expect(service.processFile('file-1', 'bad-data'))
        .rejects.toThrow('OCR engine crash');

      expect(ocrTaskRepo.update).toHaveBeenCalledWith('ocr-task-1', expect.objectContaining({
        status: 'failed',
        errorMsg: 'OCR engine crash',
      }));
    });

    it('should return empty string when tesseract returns empty', async () => {
      Tesseract.recognize.mockResolvedValue({ data: { text: '' } });

      const text = await service.processFile('file-1', 'empty-image');

      expect(text).toBe('');
    });

    it('should handle whitespace-only result from tesseract', async () => {
      Tesseract.recognize.mockResolvedValue({ data: { text: '  \n  ' } });

      const text = await service.processFile('file-1', 'whitespace-image');

      // text.trim() returns empty string
      expect(text).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // processFile — remote OCR fallback
  // ═══════════════════════════════════════════════════════════

  describe('processFile — remote OCR', () => {
    it('should use remote OCR when apiUrl configured and no base64', async () => {
      // Re-create with remote OCR configured
      const module2: TestingModule = await Test.createTestingModule({
        providers: [
          OCRService,
          { provide: getRepositoryToken(OcrTask), useValue: ocrTaskRepo },
          { provide: ConfigService, useValue: mockConfig({ 'ocr.apiUrl': 'http://paddleocr:8866/ocr' }) },
        ],
      }).compile();
      const service2 = module2.get<OCRService>(OCRService);

      // Mock axios for remote call
      const axios = require('axios');
      jest.spyOn(axios, 'post').mockResolvedValue({ data: { text: 'remote ocr result' } });

      const text = await service2.processFile('file-2');

      expect(text).toBe('remote ocr result');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // processFile — no OCR available
  // ═══════════════════════════════════════════════════════════

  describe('processFile — no OCR available', () => {
    it('should return placeholder when no base64 and no apiUrl', async () => {
      const text = await service.processFile('file-3');

      expect(text).toContain('OCR unavailable');
      expect(ocrTaskRepo.update).toHaveBeenCalledWith('ocr-task-1', expect.objectContaining({
        status: 'completed',
      }));
    });
  });
});
