/**
 * PaymentController 单元测试
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

describe('PaymentController', () => {
  let controller: PaymentController;
  let paymentService: any;

  beforeEach(async () => {
    paymentService = {
      getPaymentStatus: jest.fn().mockResolvedValue({ status: 'created' }),
      handleCallback: jest.fn().mockResolvedValue({ code: 'SUCCESS' }),
      mockPay: jest.fn().mockResolvedValue({ code: 0, message: '支付成功' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [{ provide: PaymentService, useValue: paymentService }],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  it('GET /orders/:id/payment-status → should return payment status', async () => {
    const result = await controller.getPaymentStatus('order-1', 'user-1');
    expect(result.status).toBe('created');
    expect(paymentService.getPaymentStatus).toHaveBeenCalledWith('order-1', 'user-1');
  });

  it('POST /orders/callback → should handle WeChat Pay callback', async () => {
    const req = { headers: { 'wechatpay-signature': 'sig', 'wechatpay-timestamp': '123', 'wechatpay-nonce': 'abc' } };
    const body = { resource: { ciphertext: 'enc', associated_data: 'aad', nonce: 'nonce' } };
    const result = await controller.callback(req, body);
    expect(paymentService.handleCallback).toHaveBeenCalledWith(req.headers, body);
    expect(result.code).toBe('SUCCESS');
  });

  it('POST /orders/:id/mock-pay → should simulate payment in dev mode', async () => {
    const result = await controller.mockPay('order-1');
    expect(result.code).toBe(0);
    expect(paymentService.mockPay).toHaveBeenCalledWith('order-1');
  });
});
