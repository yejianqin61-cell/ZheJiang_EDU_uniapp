/**
 * AdminController 单元测试
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { DashboardService } from './services/dashboard.service';
import { QuestionManageService } from './services/question-manage.service';
import { FileManageService } from './services/file-manage.service';
import { SeedService } from './services/seed.service';
import { BulkSeedService } from './services/bulk-seed.service';

describe('AdminController', () => {
  let controller: AdminController;
  let dashboardService: any;
  let questionManageService: any;
  let fileManageService: any;

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
    fileManageService = {
      list: jest.fn().mockResolvedValue({ list: [], pagination: { total: 0 } }),
      delete: jest.fn().mockResolvedValue({ deleted: true }),
    };
    const seedService = { seed: jest.fn(), setUserRole: jest.fn() };
    const bulkSeedService = { seedSubject: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: DashboardService, useValue: dashboardService },
        { provide: QuestionManageService, useValue: questionManageService },
        { provide: FileManageService, useValue: fileManageService },
        { provide: SeedService, useValue: seedService },
        { provide: BulkSeedService, useValue: bulkSeedService },
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

  describe('GET /admin/files', () => {
    it('should list files', async () => {
      const result = await controller.listFiles({ page: 1, pageSize: 10 });
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('DELETE /admin/files/:id', () => {
    it('should delete a file', async () => {
      const result = await controller.deleteFile('file-1');
      expect(result.deleted).toBe(true);
    });
  });
});
