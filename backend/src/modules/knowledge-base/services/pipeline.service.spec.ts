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

  describe('process — text file', () => {
    it('should run full pipeline without OCR', async () => {
      fileRepo.findOne.mockResolvedValue({
        id: 'file-1', fileType: 'md', subject: '数学', grade: '五年级',
      });

      await service.process('file-1', 'Q1\nQ2\nQ3');

      expect(ocrService.processFile).not.toHaveBeenCalled();
      expect(splitterService.split).toHaveBeenCalledWith('Q1\nQ2\nQ3');
      expect(taggerService.tagQuestion).toHaveBeenCalledTimes(3);
      expect(knowledgeService.findOrCreate).toHaveBeenCalledTimes(6); // 3 qs × 2 KPs
      expect(fileRepo.update).toHaveBeenCalledWith('file-1', expect.objectContaining({ status: 'completed' }));
    });
  });

  describe('process — image file', () => {
    it('should call OCR then pipeline', async () => {
      fileRepo.findOne.mockResolvedValue({
        id: 'file-2', fileType: 'png', subject: '数学', grade: '五年级',
      });

      await service.process('file-2', undefined, 'base64imagedata');

      expect(ocrService.processFile).toHaveBeenCalledWith('file-2', 'base64imagedata');
      expect(splitterService.split).toHaveBeenCalledWith('OCR text');
    });
  });

  describe('process — no text extracted', () => {
    it('should mark file as failed when no text', async () => {
      fileRepo.findOne.mockResolvedValue({
        id: 'file-3', fileType: 'pdf', subject: '数学', grade: '五年级',
      });

      ocrService.processFile.mockResolvedValue('');

      await expect(
        service.process('file-3', undefined, 'base64'),
      ).rejects.toThrow('No text content extracted');

      expect(fileRepo.update).toHaveBeenCalledWith('file-3', expect.objectContaining({ status: 'failed' }));
    });
  });

  describe('process — splitter finds no questions', () => {
    it('should mark file as failed', async () => {
      fileRepo.findOne.mockResolvedValue({
        id: 'file-4', fileType: 'md', subject: '数学', grade: '五年级',
      });
      splitterService.split.mockResolvedValue([]);

      await expect(
        service.process('file-4', 'some text with no questions'),
      ).rejects.toThrow('No questions detected');
    });
  });
});
