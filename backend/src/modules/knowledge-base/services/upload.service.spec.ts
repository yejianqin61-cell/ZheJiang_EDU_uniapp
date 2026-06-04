/**
 * UploadService 单元测试 — 文件上传服务
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { UploadService } from './upload.service';
import { KbFile } from '../../../database/entities/kb-file.entity';
import { CosService } from '../../../common/cos.service';
import { mockRepo, createMockFile } from '../../../test-utils';

// Mock mammoth
jest.mock('mammoth', () => ({
  extractRawText: jest.fn(),
}));

// Mock pdf-parse
jest.mock('pdf-parse', () => jest.fn());

describe('UploadService', () => {
  let service: UploadService;
  let fileRepo: any;
  let cosService: any;
  let mammoth: any;
  let pdfParse: any;
  const uploaderId = 'admin-1';
  const pipeline = jest.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    fileRepo = mockRepo({
      save: jest.fn().mockImplementation((entity: any) =>
        Promise.resolve({ id: 'kb-file-new-1', ...entity })),
    });
    cosService = {
      upload: jest.fn().mockResolvedValue({ key: 'uploads/test.md', url: 'https://cos.example.com/uploads/test.md' }),
      read: jest.fn().mockResolvedValue(Buffer.from('test')),
      getDownloadUrl: jest.fn().mockReturnValue('https://cos.example.com/uploads/test.md'),
      getContentType: jest.fn().mockReturnValue('text/markdown'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: getRepositoryToken(KbFile), useValue: fileRepo },
        { provide: CosService, useValue: cosService },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    mammoth = require('mammoth');
    pdfParse = require('pdf-parse');
  });

  // ═══════════════════════════════════════════════════════════
  // upload — MD files
  // ═══════════════════════════════════════════════════════════

  describe('upload — MD files', () => {
    it('should upload MD file and trigger pipeline', async () => {
      const file = createMockFile({
        originalname: 'math.md',
        mimetype: 'text/markdown',
        buffer: Buffer.from('# 题目1\n1+1=?'),
        size: 100,
      });

      const result = await service.upload(uploaderId, file, '数学', '五年级', pipeline);

      expect(result.fileId).toBeDefined();
      expect(result.status).toBe('processing');
      expect(fileRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        filename: 'math.md',
        fileType: 'md',
        subject: '数学',
        grade: '五年级',
      }));
      // Pipeline should be called with extracted text
      expect(pipeline).toHaveBeenCalledWith(
        expect.any(String),
        '# 题目1\n1+1=?',
        undefined,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // upload — DOCX files
  // ═══════════════════════════════════════════════════════════

  describe('upload — DOCX files', () => {
    it('should extract text from DOCX via mammoth', async () => {
      mammoth.extractRawText.mockResolvedValue({ value: '提取的Word文本内容' });
      const file = createMockFile({
        originalname: 'exam.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: Buffer.from('fake-docx'),
        size: 5000,
      });

      const result = await service.upload(uploaderId, file, '语文', '三年级', pipeline);

      expect(result.fileId).toBeDefined();
      expect(pipeline).toHaveBeenCalledWith(
        expect.any(String),
        '提取的Word文本内容',
        undefined,
      );
    });

    it('should handle empty DOCX extraction', async () => {
      mammoth.extractRawText.mockResolvedValue({ value: '' });
      const file = createMockFile({
        originalname: 'empty.docx',
        buffer: Buffer.from('empty'),
        size: 100,
      });

      const result = await service.upload(uploaderId, file, '语文', '三年级', pipeline);

      // Empty text → rawText = undefined
      expect(pipeline).toHaveBeenCalledWith(
        expect.any(String),
        undefined,
        undefined,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // upload — PDF files
  // ═══════════════════════════════════════════════════════════

  describe('upload — PDF files', () => {
    it('should extract text from PDF via pdf-parse', async () => {
      pdfParse.mockResolvedValue({ text: 'PDF文本内容' });
      const file = createMockFile({
        originalname: 'exam.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('fake-pdf'),
        size: 10000,
      });

      await service.upload(uploaderId, file, '英语', '七年级', pipeline);

      expect(pdfParse).toHaveBeenCalled();
      expect(pipeline).toHaveBeenCalledWith(
        expect.any(String),
        'PDF文本内容',
        undefined,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // upload — Image files (PNG/JPG)
  // ═══════════════════════════════════════════════════════════

  describe('upload — Image files', () => {
    it('should encode image as base64 and trigger OCR pipeline', async () => {
      const file = createMockFile({
        originalname: 'photo.png',
        mimetype: 'image/png',
        buffer: Buffer.from('fake-image-data'),
        size: 50000,
      });

      const result = await service.upload(uploaderId, file, '数学', '五年级', pipeline);

      expect(result.status).toBe('processing');
      // Pipeline called with base64
      expect(pipeline).toHaveBeenCalledWith(
        expect.any(String),
        undefined,
        'ZmFrZS1pbWFnZS1kYXRh', // base64 of 'fake-image-data'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // upload — Validation
  // ═══════════════════════════════════════════════════════════

  describe('upload — validation', () => {
    it('should reject unsupported file format', async () => {
      const file = createMockFile({
        originalname: 'virus.exe',
        buffer: Buffer.from('malware'),
        size: 100,
      });

      await expect(
        service.upload(uploaderId, file, '数学', '五年级', pipeline),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject text file over 50MB', async () => {
      const file = createMockFile({
        originalname: 'huge.md',
        buffer: Buffer.alloc(51 * 1024 * 1024), // 51MB
        size: 51 * 1024 * 1024,
      });

      await expect(
        service.upload(uploaderId, file, '数学', '五年级', pipeline),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject image file over 10MB', async () => {
      const file = createMockFile({
        originalname: 'huge.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.alloc(11 * 1024 * 1024), // 11MB
        size: 11 * 1024 * 1024,
      });

      await expect(
        service.upload(uploaderId, file, '数学', '五年级', pipeline),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject file with no extension', async () => {
      const file = createMockFile({
        originalname: 'noextension',
        buffer: Buffer.from('data'),
        size: 100,
      });

      await expect(
        service.upload(uploaderId, file, '数学', '五年级', pipeline),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getFileStatus
  // ═══════════════════════════════════════════════════════════

  describe('getFileStatus', () => {
    it('should return file status when file exists', async () => {
      fileRepo.findOne.mockResolvedValue({
        id: 'file-1',
        filename: 'math.md',
        fileType: 'md',
        subject: '数学',
        grade: '五年级',
        status: 'completed',
        questionCount: 5,
        errorMsg: null,
        createdAt: new Date(),
      });

      const result = await service.getFileStatus('file-1');

      expect(result!.fileId).toBe('file-1');
      expect(result!.status).toBe('completed');
      expect(result!.questionCount).toBe(5);
    });

    it('should return null when file not found', async () => {
      fileRepo.findOne.mockResolvedValue(null);

      const result = await service.getFileStatus('nonexistent');

      expect(result).toBeNull();
    });
  });
});
