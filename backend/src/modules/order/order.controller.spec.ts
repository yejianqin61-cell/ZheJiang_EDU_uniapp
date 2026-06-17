/**
 * OrderController 单元测试 — 双模式支持
 */
import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PaymentService } from '../payment/payment.service';

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: any;
  let paymentService: any;

  beforeEach(async () => {
    orderService = {
      create: jest.fn().mockResolvedValue({ orderId: 'order-1', amount: 500, orderNo: 'ORD001', type: 'download' }),
      list: jest.fn().mockResolvedValue({ list: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } }),
      getDetail: jest.fn().mockResolvedValue({ orderId: 'order-1', type: 'download', status: 'pending', amount: 500 }),
      getDownloadUrl: jest.fn().mockResolvedValue({ docxUrl: '/dl/docx', pdfUrl: '/dl/pdf' }),
      cancelExpiredOrders: jest.fn().mockRejectedValue(new Error('no queue')),
    };
    paymentService = {
      createAlipayPayment: jest.fn().mockResolvedValue({ payForm: '<form>...</form>' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        { provide: OrderService, useValue: orderService },
        { provide: PaymentService, useValue: paymentService },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
  });

  describe('POST /orders (download)', () => {
    it('should create download order and payment', async () => {
      const result = await controller.create('user-1', { paperId: 'paper-1', type: 'download' });
      expect(result.orderId).toBe('order-1');
      expect(result.payment).toBeDefined();
      expect(orderService.create).toHaveBeenCalledWith({
        userId: 'user-1', paperId: 'paper-1', type: 'download', copies: undefined, shippingAddressId: undefined,
      });
      expect(paymentService.createAlipayPayment).toHaveBeenCalledWith('order-1');
    });

    it('should return order without wxPayParams on payment failure', async () => {
      paymentService.createAlipayPayment.mockRejectedValue(new Error('pay failed'));
      const result = await controller.create('user-1', { paperId: 'paper-1', type: 'download' });
      expect(result.orderId).toBe('order-1');
      expect(result.payment).toBeNull();
    });
  });

  describe('POST /orders (print)', () => {
    it('should create print order with copies and address', async () => {
      orderService.create.mockResolvedValue({
        orderId: 'order-2', amount: 12000, orderNo: 'ORD002', type: 'print', copies: 30,
      });
      const result = await controller.create('user-1', {
        paperId: 'paper-1', type: 'print', copies: 30, shippingAddressId: 'addr-1',
      });
      expect(result.type).toBe('print');
      expect(result.copies).toBe(30);
      expect(orderService.create).toHaveBeenCalledWith({
        userId: 'user-1', paperId: 'paper-1', type: 'print', copies: 30, shippingAddressId: 'addr-1',
      });
    });
  });

  describe('GET /orders', () => {
    it('should list orders with type filter', async () => {
      const result = await controller.list('user-1', 'teacher', { page: 1, pageSize: 10 }, 'download', undefined);
      expect(result.pagination.total).toBe(0);
    });

    it('should enforce mine scope for non-admin', async () => {
      await controller.list('user-1', 'teacher', { page: 1, pageSize: 10 }, undefined, 'others');
      expect(orderService.list).toHaveBeenCalledWith(expect.objectContaining({ scope: 'mine' }));
    });

    it('should allow others scope for admin', async () => {
      await controller.list('user-1', 'admin', { page: 1, pageSize: 10 }, 'print', 'others');
      expect(orderService.list).toHaveBeenCalledWith(expect.objectContaining({ scope: 'others', type: 'print' }));
    });
  });

  describe('GET /orders/:id', () => {
    it('should get order detail (owner)', async () => {
      const result = await controller.getDetail('order-1', 'user-1', 'teacher');
      expect(result.status).toBe('pending');
      expect(orderService.getDetail).toHaveBeenCalledWith('order-1', 'user-1', false);
    });

    it('should allow admin to view any order', async () => {
      await controller.getDetail('order-1', 'admin-1', 'admin');
      expect(orderService.getDetail).toHaveBeenCalledWith('order-1', 'admin-1', true);
    });
  });

  describe('GET /orders/:id/download', () => {
    it('should return download URLs', async () => {
      const result = await controller.getDownloadUrl('order-1', 'user-1');
      expect(result.docxUrl).toBeDefined();
    });
  });
});
