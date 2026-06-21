import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { WxPayClient } from './wxpay.client';
import { AlipayProvider } from './providers/alipay.provider';
import { Payment } from '../../database/entities/payment.entity';
import { Order } from '../../database/entities/order.entity';
import { Paper } from '../../database/entities/paper.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { BalanceService } from '../balance/services/balance.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let orderRepo: any; let paymentRepo: any; let paperRepo: any;
  let wxPayClient: any; let alipayProvider: any; let balanceService: any;

  beforeEach(async () => {
    orderRepo = { findOne: jest.fn(), update: jest.fn().mockResolvedValue({ affected: 1 }) };
    paymentRepo = { findOne: jest.fn(), save: jest.fn(), create: jest.fn((d) => d), update: jest.fn().mockResolvedValue({ affected: 1 }) };
    paperRepo = { findOne: jest.fn(), update: jest.fn().mockResolvedValue({ affected: 1 }) };
    wxPayClient = { verifySignature: jest.fn().mockReturnValue(true), decryptResource: jest.fn().mockReturnValue({ out_trade_no: 'otn', transaction_id: 'txn', trade_state: 'SUCCESS', amount: { total: 500 } }) };
    alipayProvider = { createPayment: jest.fn().mockResolvedValue({ payForm: '<form>', provider: 'alipay', amount: 500 }), verifyCallback: jest.fn().mockResolvedValue({ success: true, outTradeNo: 'otn', transactionId: 'txn', amount: 500 }) };
    balanceService = { addBalance: jest.fn().mockResolvedValue({ balance: 100 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(Paper), useValue: paperRepo },
        { provide: WxPayClient, useValue: wxPayClient },
        { provide: AlipayProvider, useValue: alipayProvider },
        { provide: BalanceService, useValue: balanceService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  describe('createAlipayPayment', () => {
    it('should create payment and return payForm', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'order-1', paperId: 'paper-1', status: 'pending', amount: 500 });
      paperRepo.findOne.mockResolvedValue({ id: 'paper-1', title: '测试卷' });
      paymentRepo.findOne.mockResolvedValue(null);
      paymentRepo.save.mockImplementation((e: any) => Promise.resolve({ ...e, id: 'pay-1' }));
      const result = await service.createAlipayPayment('order-1');
      expect(result.payForm).toBeDefined();
    });

    it('should throw if order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.createAlipayPayment('bad-order')).rejects.toThrow(NotFoundException);
    });

    it('should throw if order not pending', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', paperId: 'p1', status: 'paid', amount: 500 });
      paperRepo.findOne.mockResolvedValue({ title: 'x' });
      await expect(service.createAlipayPayment('o1')).rejects.toThrow(ConflictException);
    });
  });

  describe('handleAlipayCallback', () => {
    it('should process successful payment callback', async () => {
      paymentRepo.findOne.mockResolvedValue({ id: 'pay-1', orderId: 'o1', status: 'created', amount: 500, outTradeNo: 'otn' });
      orderRepo.findOne.mockResolvedValue({ id: 'o1', paperId: 'p1' });
      const result = await service.handleAlipayCallback({ out_trade_no: 'otn', trade_no: 'txn', total_amount: '5.00', trade_status: 'TRADE_SUCCESS', sign: 'x' });
      expect(result.code).toBe('SUCCESS');
      expect(paymentRepo.update).toHaveBeenCalledWith('pay-1', expect.objectContaining({ status: 'success' }));
      expect(orderRepo.update).toHaveBeenCalledWith('o1', expect.objectContaining({ status: 'paid' }));
    });
  });

  describe('payByBalance', () => {
    it('should deduct balance and mark order as paid for the owner', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', userId: 'user-1', paperId: 'p1', status: 'pending', amount: 500 });
      paperRepo.findOne.mockResolvedValue({ id: 'p1' });

      const result = await service.payByBalance('o1', 'user-1');

      expect(balanceService.addBalance).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-1',
        amount: -500,
        type: 'pay_order',
      }));
      expect(orderRepo.update).toHaveBeenCalledWith('o1', expect.objectContaining({ status: 'paid' }));
      expect(paperRepo.update).toHaveBeenCalledWith('p1', { status: 'paid' });
      expect(result.code).toBe('SUCCESS');
    });

    it('should reject balance payment for another user order', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', userId: 'other-user', paperId: 'p1', status: 'pending', amount: 500 });

      await expect(service.payByBalance('o1', 'user-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('getPaymentStatus', () => {
    it('should return the current order payment status', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', userId: 'user-1', status: 'paid', paidAt: new Date('2026-06-21T00:00:00Z') });

      const result = await service.getPaymentStatus('o1', 'user-1');

      expect(result.orderId).toBe('o1');
      expect(result.status).toBe('paid');
    });

    it('should throw when the order is not found for the user', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(service.getPaymentStatus('missing', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('mockPay', () => {
    it('should update order and paper to paid', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 'o1', paperId: 'p1', status: 'pending' });
      paymentRepo.findOne.mockResolvedValue({ id: 'pay-1', orderId: 'o1' });
      const result = await service.mockPay('o1');
      expect(result.code).toBe('SUCCESS');
    });
  });
});
