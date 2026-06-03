import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { WxPayClient } from './wxpay.client';
import { Payment } from '../../database/entities/payment.entity';
import { Order } from '../../database/entities/order.entity';
import { Paper } from '../../database/entities/paper.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('PaymentService', () => {
  let service: PaymentService;
  let orderRepo: any;
  let paymentRepo: any;
  let paperRepo: any;
  let wxPayClient: any;

  beforeEach(async () => {
    orderRepo = { findOne: jest.fn(), update: jest.fn().mockResolvedValue({ affected: 1 }), find: jest.fn() };
    paymentRepo = { findOne: jest.fn(), save: jest.fn(), create: jest.fn((d) => d), update: jest.fn().mockResolvedValue({ affected: 1 }) };
    paperRepo = { findOne: jest.fn(), update: jest.fn().mockResolvedValue({ affected: 1 }) };
    wxPayClient = {
      unifiedOrder: jest.fn().mockResolvedValue({
        prepayId: 'prepay_test_123',
        wxPayParams: { timeStamp: '123', nonceStr: 'abc', package: 'prepay_id=prepay_test_123', signType: 'RSA', paySign: 'DEV_MOCK_SIGN' },
      }),
      verifySignature: jest.fn().mockReturnValue(true),
      decryptResource: jest.fn().mockReturnValue({ out_trade_no: 'otn_001', transaction_id: 'txn_001', trade_state: 'SUCCESS', amount: { total: 500 } }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(Paper), useValue: paperRepo },
        { provide: WxPayClient, useValue: wxPayClient },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  describe('createPayment', () => {
    it('should create payment and return wxPayParams', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'order-1', paperId: 'paper-1', status: 'pending', amount: 500, userId: 'u1' });
      paperRepo.findOne.mockResolvedValue({ id: 'paper-1', title: '测试卷' });
      paymentRepo.findOne.mockResolvedValue(null);
      paymentRepo.save.mockImplementation((e: any) => Promise.resolve({ ...e, id: 'pay-1' }));

      const result = await service.createPayment('order-1', 'openid_test');

      expect(wxPayClient.unifiedOrder).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 500, openid: 'openid_test' }),
      );
      expect(result.wxPayParams).toBeDefined();
    });

    it('should throw if order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.createPayment('bad-order', 'x')).rejects.toThrow(NotFoundException);
    });

    it('should throw if order not pending', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', paperId: 'p1', status: 'paid', amount: 500 });
      paperRepo.findOne.mockResolvedValue({ title: 'x' });
      await expect(service.createPayment('o1', 'x')).rejects.toThrow(ConflictException);
    });
  });

  describe('mockPay', () => {
    it('should update order and paper to paid', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', paperId: 'p1', status: 'pending' });
      paymentRepo.findOne.mockResolvedValue({ id: 'pay-1', orderId: 'o1' });

      const result = await service.mockPay('o1');

      expect(result.code).toBe('SUCCESS');
      expect(orderRepo.update).toHaveBeenCalledWith('o1', expect.objectContaining({ status: 'paid' }));
      expect(paperRepo.update).toHaveBeenCalledWith('p1', { status: 'paid' });
    });

    it('should throw if order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.mockPay('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('handleCallback', () => {
    it('should process successful payment callback', async () => {
      paymentRepo.findOne.mockResolvedValue({ id: 'pay-1', orderId: 'o1', status: 'created', amount: 500, wxOutTradeNo: 'otn_001' });
      orderRepo.findOne.mockResolvedValue({ id: 'o1', paperId: 'p1' });

      const result = await service.handleCallback(
        { 'wechatpay-signature': 'sig', 'wechatpay-timestamp': '123', 'wechatpay-nonce': 'abc' },
        { resource: { ciphertext: 'enc', associated_data: '', nonce: 'n' } },
      );

      expect(result.code).toBe('SUCCESS');
      expect(paymentRepo.update).toHaveBeenCalledWith('pay-1', expect.objectContaining({ status: 'success' }));
      expect(orderRepo.update).toHaveBeenCalledWith('o1', expect.objectContaining({ status: 'paid' }));
    });
  });
});
