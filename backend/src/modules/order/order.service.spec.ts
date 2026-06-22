import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { OrderService } from './order.service';
import { Order } from '../../database/entities/order.entity';
import { Paper } from '../../database/entities/paper.entity';
import { PricingService } from '../print/services/pricing.service';
import { ShippingAddressService } from '../print/services/shipping-address.service';
import { NotFoundException, ConflictException, Logger } from '@nestjs/common';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepo: any;
  let paperRepo: any;
  let pricingService: any;
  let shippingAddressService: any;

  afterEach(() => {
    jest.restoreAllMocks();
  });

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
      manager: {
        query: jest.fn().mockResolvedValue([]),
      },
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };
    pricingService = {
      getDownloadPrice: jest.fn().mockResolvedValue(200),
      calculatePrintPrice: jest.fn().mockResolvedValue({ tier: 2, unitPrice: 400, total: 12000 }),
      getPricingConfig: jest.fn(),
      updatePricing: jest.fn(),
      seedDefaults: jest.fn(),
    };
    shippingAddressService = {
      listByUser: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      snapshot: jest.fn().mockResolvedValue({
        receiverName: '张三',
        phone: '13800138000',
        province: '浙江省',
        city: '杭州市',
        district: '西湖区',
        detail: '文三路138号',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(Paper), useValue: paperRepo },
        { provide: ConfigService, useValue: { get: jest.fn((k: string, d: any) => d ?? 500) } },
        { provide: PricingService, useValue: pricingService },
        { provide: ShippingAddressService, useValue: shippingAddressService },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  describe('create (download)', () => {
    it('should create download order for valid paper', async () => {
      paperRepo.findOne.mockResolvedValue({ id: 'paper-1', title: '测试卷', questionIds: Array(20).fill('q1') });
      orderRepo.findOne.mockResolvedValue(null); // no existing

      const result = await service.create({ userId: 'user-1', paperId: 'paper-1', type: 'download' });

      expect(result.orderId).toBe('order-1');
      expect(result.amount).toBe(4000); // 200 * 20
      expect(result.type).toBe('download');
      expect(result.orderNo).toBeDefined();
    });

    it('should throw if paper not found', async () => {
      paperRepo.findOne.mockResolvedValue(null);
      paperRepo.manager.query.mockResolvedValue([]);
      await expect(service.create({ userId: 'u1', paperId: 'bad-paper', type: 'download' })).rejects.toThrow(NotFoundException);
    });

    it('should throw if duplicate pending download order exists', async () => {
      paperRepo.findOne.mockResolvedValue({ id: 'paper-1', questionIds: [] });
      orderRepo.findOne.mockResolvedValue({ id: 'existing', status: 'pending', type: 'download' });
      await expect(service.create({ userId: 'u1', paperId: 'paper-1', type: 'download' })).rejects.toThrow(ConflictException);
    });
  });

  describe('create (print)', () => {
    it('should create print order with pricing and address snapshot', async () => {
      paperRepo.findOne.mockResolvedValue({ id: 'paper-1', title: '测试卷', questionIds: Array(20).fill('q1') });
      orderRepo.findOne.mockResolvedValue(null);

      const result = await service.create({
        userId: 'user-1', paperId: 'paper-1', type: 'print', copies: 30, shippingAddressId: 'addr-1',
      });

      expect(result.orderId).toBe('order-1');
      expect(result.amount).toBe(12000);
      expect(result.type).toBe('print');
      expect(result.copies).toBe(30);
      expect(shippingAddressService.snapshot).toHaveBeenCalledWith('addr-1', 'user-1');
    });

    it('should throw if copies not provided for print', async () => {
      paperRepo.findOne.mockResolvedValue({ id: 'paper-1' });
      await expect(service.create({
        userId: 'u1', paperId: 'paper-1', type: 'print',
      })).rejects.toThrow(ConflictException);
    });

    it('should throw if no address for print', async () => {
      paperRepo.findOne.mockResolvedValue({ id: 'paper-1' });
      await expect(service.create({
        userId: 'u1', paperId: 'paper-1', type: 'print', copies: 5,
      })).rejects.toThrow(ConflictException);
    });
  });

  describe('list', () => {
    it('should return paginated orders (scope=mine)', async () => {
      orderRepo.createQueryBuilder().getManyAndCount.mockResolvedValue([
        [{ id: 'o1', orderNo: 'NO1', paperId: 'p1', type: 'download', amount: 500, status: 'pending', copies: null, printStatus: null, shippingSnapshot: null, pricingSnapshot: null, unitPrice: 0, createdAt: new Date(), userId: 'u1', paidAt: null, expiredAt: new Date(), updatedAt: new Date() }],
        1,
      ]);

      const result = await service.list({ userId: 'u1', page: 1, pageSize: 20 });

      expect(result.list).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by type', async () => {
      const qb = orderRepo.createQueryBuilder();
      await service.list({ userId: 'u1', page: 1, pageSize: 20, type: 'print' });
      expect(qb.andWhere).toHaveBeenCalled();
    });

    it('should log and continue when exercise subject fallback query fails', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      paperRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'paper-1' }]),
      });
      paperRepo.manager.query.mockRejectedValue(new Error('exercise lookup failed'));

      await service.list({ userId: 'u1', page: 1, pageSize: 20, subject: '数学' });

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to load exercise paper IDs for subject 数学',
        expect.any(String),
      );
    });

    it('should log and keep empty title when exercise title fallback query fails', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      orderRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[
          {
            id: 'o1',
            orderNo: 'NO1',
            paperId: 'missing-paper',
            type: 'exercise',
            amount: 500,
            status: 'paid',
            copies: null,
            printStatus: null,
            shippingSnapshot: null,
            pricingSnapshot: null,
            unitPrice: 0,
            createdAt: new Date(),
            userId: 'u1',
            paidAt: null,
            expiredAt: new Date(),
            updatedAt: new Date(),
          },
        ], 1]),
      });
      paperRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });
      paperRepo.manager.query.mockRejectedValue(new Error('title lookup failed'));

      const result = await service.list({ userId: 'u1', page: 1, pageSize: 20 });

      expect(result.list[0].paperTitle).toBe('');
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to load exercise paper titles for order list: missing-paper',
        expect.any(String),
      );
    });
  });

  describe('getDetail', () => {
    it('should return download order detail with paper title', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'o1', paperId: 'p1', orderNo: 'NO1', type: 'download', amount: 500, unitPrice: 200,
        status: 'pending', copies: null, printStatus: null, shippingSnapshot: null, pricingSnapshot: null,
        paidAt: null, expiredAt: new Date(), createdAt: new Date(), userId: 'u1',
      });
      paperRepo.findOne.mockResolvedValue({ id: 'p1', title: '测试卷', questionIds: ['q1'], exportDocxUrl: null, exportPdfUrl: null });

      const result = await service.getDetail('o1', 'u1');

      expect(result.paperTitle).toBe('测试卷');
      expect(result.type).toBe('download');
    });

    it('should throw if order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.getDetail('bad', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should log and keep empty title when detail fallback query fails', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      orderRepo.findOne.mockResolvedValue({
        id: 'o1', paperId: 'exercise-paper-1', orderNo: 'NO1', type: 'exercise', amount: 500, unitPrice: 200,
        status: 'paid', copies: null, printStatus: null, shippingSnapshot: null, pricingSnapshot: null,
        paidAt: null, expiredAt: new Date(), createdAt: new Date(), updatedAt: new Date(), userId: 'u1',
      });
      paperRepo.findOne.mockResolvedValue(null);
      paperRepo.manager.query.mockRejectedValue(new Error('detail title lookup failed'));

      const result = await service.getDetail('o1', 'u1');

      expect(result.paperTitle).toBe('');
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to load exercise paper title for order detail: exercise-paper-1',
        expect.any(String),
      );
    });
  });

  describe('getDownloadUrl', () => {
    it('should throw if order is print type', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', paperId: 'p1', status: 'paid', type: 'print' });
      await expect(service.getDownloadUrl('o1', 'u1')).rejects.toThrow(ConflictException);
    });

    it('should throw if order not paid', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', paperId: 'p1', status: 'pending', type: 'download' });
      await expect(service.getDownloadUrl('o1', 'u1')).rejects.toThrow(ConflictException);
    });

    it('should return download URLs for paid download order', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', paperId: 'p1', status: 'paid', type: 'download' });
      paperRepo.findOne.mockResolvedValue({ id: 'p1', exportDocxUrl: '/v1/download/f1.docx', exportPdfUrl: null });

      const result = await service.getDownloadUrl('o1', 'u1');
      expect(result.docxUrl).toBe('/v1/download/f1.docx');
      expect(result.pdfUrl).toBeNull();
    });
  });
});
