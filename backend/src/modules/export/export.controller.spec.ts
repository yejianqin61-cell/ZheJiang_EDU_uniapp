/**
 * ExportController 单元测试
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

describe('ExportController', () => {
  let controller: ExportController;
  let exportService: any;

  beforeEach(async () => {
    exportService = {
      exportDocx: jest.fn().mockResolvedValue({
        downloadUrl: '/download/file-1', expiresAt: '2026-06-05T00:00:00.000Z',
      }),
      exportPdf: jest.fn().mockResolvedValue({
        downloadUrl: '/download/file-2', expiresAt: '2026-06-05T00:00:00.000Z',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportController],
      providers: [{ provide: ExportService, useValue: exportService }],
    }).compile();

    controller = module.get<ExportController>(ExportController);
  });

  describe('POST /papers/:id/export/docx', () => {
    it('should export DOCX', async () => {
      const result = await controller.exportDocx('paper-1', 'user-1');
      expect(result.downloadUrl).toBe('/download/file-1');
      expect(exportService.exportDocx).toHaveBeenCalledWith('paper-1', 'user-1');
    });
  });

  describe('POST /papers/:id/export/pdf', () => {
    it('should export PDF', async () => {
      const result = await controller.exportPdf('paper-1', 'user-1');
      expect(result.downloadUrl).toBe('/download/file-2');
      expect(exportService.exportPdf).toHaveBeenCalledWith('paper-1', 'user-1');
    });
  });
});
