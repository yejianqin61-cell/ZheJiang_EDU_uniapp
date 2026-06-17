/**
 * ExportController 单元测试 — V2.0 含管理员导出端点
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { Order } from '../../database/entities/order.entity';

describe('ExportController', () => {
  let controller: ExportController;
  let exportService: any;
  let orderRepo: any;

  beforeEach(async () => {
    exportService = {
      exportDocx: jest.fn().mockResolvedValue({
        downloadUrl: '/download/file-1', expiresAt: '2026-06-05T00:00:00.000Z',
      }),
      exportPdf: jest.fn().mockResolvedValue({
        downloadUrl: '/download/file-2', expiresAt: '2026-06-05T00:00:00.000Z',
      }),
      exportForAdmin: jest.fn().mockResolvedValue({
        downloadUrl: '/download/file-admin',
      }),
    };
    orderRepo = { findOne: jest.fn().mockResolvedValue({ id: 'o1', paperId: 'p1' }) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportController],
      providers: [
        { provide: ExportService, useValue: exportService },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
      ],
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

  describe('GET /admin/orders/:id/export', () => {
    it('should resolve order → paperId → export for admin', async () => {
      const result = await controller.adminExportOrder('order-1');
      expect(orderRepo.findOne).toHaveBeenCalledWith({ where: { id: 'order-1' } });
      expect(exportService.exportForAdmin).toHaveBeenCalledWith('p1');
      expect(result.downloadUrl).toBe('/download/file-admin');
    });
  });
});
