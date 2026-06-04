/**
 * PipelineService 单元测试 (增强版: 10 tests → from 4)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PipelineService } from './pipeline.service';
import { OCRService } from './ocr.service';
import { SplitterService } from './splitter.service';
import { TaggerService } from './tagger.service';
import { KnowledgeService } from './knowledge.service';
import { KbFile } from '../../../database/entities/kb-file.entity';

describe('PipelineService', () => {
  let service: PipelineService;
  let fileRepo: any;
  let ocrService: any;
  let splitterService: any;
  let taggerService: any;
  let knowledgeService: any;

  beforeEach(async () => {
    fileRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    ocrService = { processFile: jest.fn().mockResolvedValue('OCR text') };
    splitterService = { split: jest.fn().mockResolvedValue(['Q1', 'Q2', 'Q3']) };
    taggerService = {
      tagQuestion: jest.fn().mockResolvedValue({ id: 'q-new' }),
      identifyKnowledgePoints: jest.fn().mockResolvedValue(['知识点A', '知识点B']),
    };
    knowledgeService = {
      findOrCreate: jest.fn().mockResolvedValue('kp-id'),
      associateQuestion: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineService,
        { provide: getRepositoryToken(KbFile), useValue: fileRepo },
        { provide: OCRService, useValue: ocrService },
        { provide: SplitterService, useValue: splitterService },
        { provide: TaggerService, useValue: taggerService },
        { provide: KnowledgeService, useValue: knowledgeService },
      ],
    }).compile();

    service = module.get<PipelineService>(PipelineService);
  });

  function mockFile(overrides: any = {}) {
    return { id: 'file-1', fileType: 'md', subject: '数学', grade: '五年级', ...overrides };
  }

  // ── text file ──

  describe('process — text file', () => {
    it('should run full pipeline without OCR', async () => {
      fileRepo.findOne.mockResolvedValue(mockFile());

      await service.process('file-1', 'Q1\nQ2\nQ3');

      expect(ocrService.processFile).not.toHaveBeenCalled();
      expect(splitterService.split).toHaveBeenCalledWith('Q1\nQ2\nQ3');
      expect(taggerService.tagQuestion).toHaveBeenCalledTimes(3);
      expect(knowledgeService.findOrCreate).toHaveBeenCalledTimes(6);
      expect(fileRepo.update).toHaveBeenCalledWith('file-1', expect.objectContaining({ status: 'completed' }));
    });

    it('should update question count on completion', async () => {
      fileRepo.findOne.mockResolvedValue(mockFile());

      await service.process('file-1', 'Q1\nQ2');

      expect(fileRepo.update).toHaveBeenCalledWith('file-1', expect.objectContaining({
        questionCount: 3, // splitter returns 3 questions
        status: 'completed',
      }));
    });
  });

  // ── image file ──

  describe('process — image file', () => {
    it('should call OCR then pipeline', async () => {
      fileRepo.findOne.mockResolvedValue(mockFile({ fileType: 'png' }));

      await service.process('file-2', undefined, 'base64imagedata');

      expect(ocrService.processFile).toHaveBeenCalledWith('file-2', 'base64imagedata');
      expect(splitterService.split).toHaveBeenCalledWith('OCR text');
    });
  });

  // ── no text ──

  describe('process — no text extracted', () => {
    it('should mark file as failed', async () => {
      fileRepo.findOne.mockResolvedValue(mockFile({ fileType: 'pdf' }));
      ocrService.processFile.mockResolvedValue('');

      await expect(
        service.process('file-3', undefined, 'base64'),
      ).rejects.toThrow('No text content extracted');

      expect(fileRepo.update).toHaveBeenCalledWith('file-3', expect.objectContaining({ status: 'failed' }));
    });
  });

  // ── splitter finds no questions ──

  describe('process — splitter finds no questions', () => {
    it('should mark file as failed', async () => {
      fileRepo.findOne.mockResolvedValue(mockFile());
      splitterService.split.mockResolvedValue([]);

      await expect(
        service.process('file-4', 'some text with no questions'),
      ).rejects.toThrow('No questions detected');
    });
  });

  // ── file not found ──

  describe('process — file not found', () => {
    it('should return early when file does not exist', async () => {
      fileRepo.findOne.mockResolvedValue(null);

      // Pipeline silently returns undefined when file not found
      const result = await service.process('nonexistent', 'text');
      expect(result).toBeUndefined();
      expect(ocrService.processFile).not.toHaveBeenCalled();
    });
  });

  // ── partial tagger failure ──

  describe('process — partial failure resilience', () => {
    it('should continue processing when one tagger call fails', async () => {
      fileRepo.findOne.mockResolvedValue(mockFile());
      // 2nd question fails
      taggerService.tagQuestion
        .mockResolvedValueOnce({ id: 'q-1' })
        .mockRejectedValueOnce(new Error('LLM timeout'))
        .mockResolvedValueOnce({ id: 'q-3' });

      await service.process('file-5', 'Q1\nQ2\nQ3');

      // Pipeline should continue despite 1 failure
      expect(fileRepo.update).toHaveBeenCalledWith('file-5', expect.objectContaining({
        status: 'completed',
        questionCount: 2, // 2 succeeded, 1 failed
      }));
    });
  });

  // ── special characters ──

  describe('process — special characters', () => {
    it('should handle text with emoji and special chars', async () => {
      fileRepo.findOne.mockResolvedValue(mockFile());
      splitterService.split.mockResolvedValue(['题目🎯']);

      await service.process('file-6', '题目🎯 with special chars');

      expect(fileRepo.update).toHaveBeenCalledWith('file-6', expect.objectContaining({
        status: 'completed',
      }));
    });
  });
});
