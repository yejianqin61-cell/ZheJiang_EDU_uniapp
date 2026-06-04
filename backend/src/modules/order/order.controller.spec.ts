/**
 * OrderController 单元测试
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
      create: jest.fn().mockResolvedValue({ orderId: 'order-1', amount: 500, orderNo: 'ORD001' }),
      list: jest.fn().mockResolvedValue({ list: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } }),
      getDetail: jest.fn().mockResolvedValue({ id: 'order-1', status: 'pending', amount: 500 }),
      getDownloadUrl: jest.fn().mockResolvedValue({ docxUrl: '/dl/docx', pdfUrl: '/dl/pdf' }),
      cancelExpiredOrders: jest.fn().mockRejectedValue(new Error('no queue')), // fire-and-forget
    };
    paymentService = {
      createPayment: jest.fn().mockResolvedValue({ wxPayParams: { paySign: 'SIGN' } }),
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

  it('POST /orders → should create order and payment', async () => {
    const result = await controller.create('user-1', 'openid-1', { paperId: 'paper-1' });
    expect(result.orderId).toBe('order-1');
    expect(result.wxPayParams).toBeDefined();
    expect(orderService.create).toHaveBeenCalledWith('user-1', 'paper-1');
    expect(paymentService.createPayment).toHaveBeenCalledWith('order-1', 'openid-1');
  });

  it('POST /orders → should return order without wxPayParams on payment failure', async () => {
    paymentService.createPayment.mockRejectedValue(new Error('pay failed'));
    const result = await controller.create('user-1', 'openid-1', { paperId: 'paper-1' });
    expect(result.orderId).toBe('order-1');
    expect(result.wxPayParams).toBeNull();
  });

  it('GET /orders → should list orders', async () => {
    const result = await controller.list('user-1', { page: 1, pageSize: 10 });
    expect(result.pagination.total).toBe(0);
  });

  it('GET /orders/:id → should get order detail', async () => {
    const result = await controller.getDetail('order-1', 'user-1');
    expect(result.status).toBe('pending');
  });

  it('GET /orders/:id/download → should return download URLs', async () => {
    const result = await controller.getDownloadUrl('order-1', 'user-1');
    expect(result.docxUrl).toBeDefined();
  });
});
