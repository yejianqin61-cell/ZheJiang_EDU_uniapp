import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

describe('PaymentController', () => {
  let controller: PaymentController;
  let paymentService: any;

  beforeEach(async () => {
    paymentService = {
      getPaymentStatus: jest.fn().mockResolvedValue({ status: 'created' }),
      handleAlipayCallback: jest.fn().mockResolvedValue({ code: 'SUCCESS' }),
      handleWxCallback: jest.fn().mockResolvedValue({ code: 'SUCCESS' }),
      createAlipayPayment: jest.fn().mockResolvedValue({ payForm: '<form>...</form>' }),
      mockPay: jest.fn().mockResolvedValue({ code: 'SUCCESS', message: '支付成功' }),
      payByBalance: jest.fn().mockResolvedValue({ message: '支付成功' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [{ provide: PaymentService, useValue: paymentService }],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  it('GET orders/:id/payment-status → return payment status', async () => {
    const result = await controller.getPaymentStatus('order-1', 'user-1');
    expect(result.status).toBe('created');
  });

  it('POST payment/alipay/callback → handle Alipay callback', async () => {
    const result = await controller.alipayCallback({ out_trade_no: '123' });
    expect(result.code).toBe('SUCCESS');
  });

  it('POST orders/callback → handle WeChat Pay callback (legacy)', async () => {
    const req = { headers: {} }; const body = {};
    const result = await controller.wxCallback(req, body);
    expect(result.code).toBe('SUCCESS');
  });

  it('POST orders/:id/mock-pay → dev mock payment', async () => {
    const result = await controller.mockPay('order-1');
    expect(result.code).toBe('SUCCESS');
  });

  it('POST orders/:id/balance-pay → balance payment', async () => {
    const result = await controller.balancePay('order-1', 'user-1');
    expect(result.message).toBe('支付成功');
  });
});
