/**
 * LocalFileService 单元测试 — 本地文件存储抽象
 */
import { Test, TestingModule } from '@nestjs/testing';
import { LocalFileService } from './local-file.service';
import { CosService } from '../../../common/cos.service';

describe('LocalFileService', () => {
  let service: LocalFileService;
  let cosService: any;

  beforeEach(async () => {
    cosService = {
      upload: jest.fn().mockResolvedValue({ key: 'exports/1717500000_test.docx', url: 'https://cos.example.com/exports/1717500000_test.docx' }),
      read: jest.fn().mockResolvedValue(Buffer.from('file content')),
      getDownloadUrl: jest.fn().mockImplementation((key: string) => `/download/${key}`),
      getContentType: jest.fn().mockImplementation((filename: string) => {
        if (filename.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (filename.endsWith('.pdf')) return 'application/pdf';
        return 'application/octet-stream';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalFileService,
        { provide: CosService, useValue: cosService },
      ],
    }).compile();

    service = module.get<LocalFileService>(LocalFileService);
  });

  // ═══════════════════════════════════════════════════════════
  // save
  // ═══════════════════════════════════════════════════════════

  describe('save', () => {
    it('should save file and return key', async () => {
      const buffer = Buffer.from('test docx content');
      const key = await service.save('test.docx', buffer);

      expect(cosService.upload).toHaveBeenCalledTimes(1);
      const callArgs = cosService.upload.mock.calls[0];
      expect(callArgs[0]).toMatch(/^exports\/\d+_test\.docx$/);
      expect(callArgs[1]).toBe(buffer);
      expect(key).toBe('exports/1717500000_test.docx');
    });

    it('should save with timestamp in key', async () => {
      cosService.upload.mockResolvedValue({ key: 'exports/1717500000_paper.pdf' });
      const buffer = Buffer.from('content');
      const key = await service.save('paper.pdf', buffer);

      // Key format: exports/{timestamp}_{filename}
      expect(key).toMatch(/^exports\/\d+_paper\.pdf$/);
    });

    it('should handle empty buffer', async () => {
      cosService.upload.mockResolvedValue({ key: 'exports/0_empty.txt' });
      const buffer = Buffer.from('');

      const key = await service.save('empty.txt', buffer);

      expect(key).toBeDefined();
      expect(cosService.upload).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // read
  // ═══════════════════════════════════════════════════════════

  describe('read', () => {
    it('should read file by key', async () => {
      const result = await service.read('exports/test.docx');

      expect(cosService.read).toHaveBeenCalledWith('exports/test.docx');
      expect(result).toBeInstanceOf(Buffer);
      expect(result!.toString()).toBe('file content');
    });

    it('should return null when file not found', async () => {
      cosService.read.mockResolvedValue(null);

      const result = await service.read('exports/missing.docx');

      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getDownloadUrl / getMimeType / getLinkTtl
  // ═══════════════════════════════════════════════════════════

  describe('getDownloadUrl', () => {
    it('should return download URL for key', () => {
      const url = service.getDownloadUrl('exports/test.docx');
      expect(url).toBe('/download/exports/test.docx');
    });
  });

  describe('getMimeType', () => {
    it('should return DOCX mime type', () => {
      expect(service.getMimeType('test.docx'))
        .toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should return PDF mime type', () => {
      expect(service.getMimeType('test.pdf'))
        .toBe('application/pdf');
    });

    it('should return octet-stream for unknown extension', () => {
      expect(service.getMimeType('test.xyz'))
        .toBe('application/octet-stream');
    });
  });

  describe('getLinkTtl', () => {
    it('should return 86400 seconds (24 hours)', () => {
      expect(service.getLinkTtl()).toBe(86400);
    });
  });
});
