/**
 * AdminController 单元测试 — V2.0 加入定价+打印订单管理
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { DashboardService } from './services/dashboard.service';
import { QuestionManageService } from './services/question-manage.service';
import { SeedService } from './services/seed.service';
import { BulkSeedService } from './services/bulk-seed.service';
import { PricingService } from '../print/services/pricing.service';
import { PrintOrderService } from '../print/services/print-order.service';

describe('AdminController', () => {
  let controller: AdminController;
  let dashboardService: any;
  let questionManageService: any;
  let pricingService: any;
  let printOrderService: any;

  beforeEach(async () => {
    dashboardService = {
      getStats: jest.fn().mockResolvedValue({ totalQuestions: 25, totalKnowledgePoints: 10 }),
    };
    questionManageService = {
      list: jest.fn().mockResolvedValue({ list: [], pagination: { total: 0 } }),
      detail: jest.fn().mockResolvedValue({ id: 'q-1', content: '题目1' }),
      softDelete: jest.fn().mockResolvedValue({ deleted: true }),
      batchDelete: jest.fn().mockResolvedValue({ deleted: 3 }),
      deleteByFile: jest.fn().mockResolvedValue({ deleted: 5 }),
    };
    const seedService = { seed: jest.fn(), setUserRole: jest.fn() };
    const bulkSeedService = { seedSubject: jest.fn() };
    pricingService = {
      getPricingConfig: jest.fn().mockResolvedValue({
        download: { unitPrice: 200, description: '按题计费' },
        print: [{ tier: 1, minQuantity: 1, maxQuantity: 10, unitPrice: 500 }],
      }),
      updatePricing: jest.fn().mockResolvedValue(undefined),
      getDownloadPrice: jest.fn(),
      calculatePrintPrice: jest.fn(),
      seedDefaults: jest.fn(),
    };
    printOrderService = {
      updatePrintStatus: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: DashboardService, useValue: dashboardService },
        { provide: QuestionManageService, useValue: questionManageService },
        { provide: SeedService, useValue: seedService },
        { provide: BulkSeedService, useValue: bulkSeedService },
        { provide: PricingService, useValue: pricingService },
        { provide: PrintOrderService, useValue: printOrderService },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  describe('GET /admin/questions/stats', () => {
    it('should return dashboard stats', async () => {
      const result = await controller.getStats();
      expect(result.totalQuestions).toBe(25);
    });
  });

  describe('GET /admin/questions', () => {
    it('should list questions with filters', async () => {
      const result = await controller.listQuestions(
        { page: 1, pageSize: 20 }, '数学', '五年级', undefined, undefined, undefined, undefined,
      );
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('GET /admin/questions/:id', () => {
    it('should return question detail', async () => {
      const result = await controller.getQuestionDetail('q-1');
      expect(result.id).toBe('q-1');
    });
  });

  describe('DELETE /admin/questions/:id', () => {
    it('should soft delete a question', async () => {
      const result = await controller.deleteQuestion('q-1');
      expect(result.deleted).toBe(true);
    });
  });

  describe('POST /admin/questions/batch-delete', () => {
    it('should batch delete questions', async () => {
      const result = await controller.batchDelete({ questionIds: ['q-1', 'q-2', 'q-3'] });
      expect(result.deleted).toBe(3);
    });
  });

  describe('GET /admin/pricing', () => {
    it('should return pricing config', async () => {
      const result = await controller.getPricing();
      expect(result.download.unitPrice).toBe(200);
      expect(result.print).toHaveLength(1);
    });
  });

  describe('PUT /admin/pricing', () => {
    it('should update pricing', async () => {
      await controller.updatePricing(
        { download: { unitPrice: 300 } },
        'admin-1',
      );
      expect(pricingService.updatePricing).toHaveBeenCalledWith(
        { download: { unitPrice: 300 }, print: undefined },
        'admin-1',
      );
    });
  });

  describe('PUT /admin/orders/:id/print-status', () => {
    it('should update print status', async () => {
      await controller.updatePrintStatus('order-1', { printStatus: 'printing' });
      expect(printOrderService.updatePrintStatus).toHaveBeenCalledWith('order-1', 'printing');
    });
  });
});
