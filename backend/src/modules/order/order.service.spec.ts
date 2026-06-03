import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { OrderService } from './order.service';
import { Order } from '../../database/entities/order.entity';
import { Paper } from '../../database/entities/paper.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepo: any;
  let paperRepo: any;

  beforeEach(async () => {
    orderRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((e: any) => Promise.resolve({ ...e, id: 'order-1' })),
      create: jest.fn((d) => d),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };
    paperRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(Paper), useValue: paperRepo },
        { provide: ConfigService, useValue: { get: jest.fn((k: string, d: any) => d ?? 500) } },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  describe('create', () => {
    it('should create order for valid paper', async () => {
      paperRepo.findOne.mockResolvedValue({ id: 'paper-1', title: '测试卷' });

      const result = await service.create('user-1', 'paper-1');

      expect(result.orderId).toBe('order-1');
      expect(result.amount).toBe(500);
      expect(result.orderNo).toBeDefined();
    });

    it('should throw if paper not found', async () => {
      paperRepo.findOne.mockResolvedValue(null);
      await expect(service.create('u1', 'bad-paper')).rejects.toThrow(NotFoundException);
    });

    it('should throw if duplicate pending order exists', async () => {
      paperRepo.findOne.mockResolvedValue({ id: 'paper-1' });
      orderRepo.findOne.mockResolvedValue({ id: 'existing', status: 'pending' });
      await expect(service.create('u1', 'paper-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('list', () => {
    it('should return paginated orders', async () => {
      orderRepo.createQueryBuilder().getManyAndCount.mockResolvedValue([
        [{ id: 'o1', orderNo: 'NO1', paperId: 'p1', amount: 500, status: 'pending', createdAt: new Date(), userId: 'u1', paidAt: null, expiredAt: new Date(), updatedAt: new Date() }],
        1,
      ]);

      const result = await service.list({ userId: 'u1', page: 1, pageSize: 20 });

      expect(result.list).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getDetail', () => {
    it('should return order detail with paper title', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', paperId: 'p1', orderNo: 'NO1', amount: 500, status: 'pending', paidAt: null, expiredAt: new Date(), createdAt: new Date() });
      paperRepo.findOne.mockResolvedValue({ id: 'p1', title: '测试卷' });

      const result = await service.getDetail('o1', 'u1');

      expect(result.paperTitle).toBe('测试卷');
    });

    it('should throw if order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.getDetail('bad', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDownloadUrl', () => {
    it('should throw if order not paid', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', paperId: 'p1', status: 'pending' });
      await expect(service.getDownloadUrl('o1', 'u1')).rejects.toThrow(ConflictException);
    });

    it('should return download URLs for paid order', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', paperId: 'p1', status: 'paid' });
      paperRepo.findOne.mockResolvedValue({ id: 'p1', exportDocxUrl: '/v1/download/f1.docx', exportPdfUrl: null });

      const result = await service.getDownloadUrl('o1', 'u1');

      expect(result.docxUrl).toBe('/v1/download/f1.docx');
      expect(result.pdfUrl).toBeNull();
    });
  });
});
