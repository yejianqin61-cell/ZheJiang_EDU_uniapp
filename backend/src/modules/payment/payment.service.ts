import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../../database/entities/payment.entity';
import { Order } from '../../database/entities/order.entity';
import { Paper } from '../../database/entities/paper.entity';
import { WxPayClient } from './wxpay.client';
import { AlipayProvider } from './providers/alipay.provider';
import { BalanceService } from '../balance/services/balance.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Paper)
    private readonly paperRepo: Repository<Paper>,
    private readonly wxPayClient: WxPayClient,
    private readonly alipayProvider: AlipayProvider,
    private readonly balanceService: BalanceService,
  ) {}

  // ── Balance payment ────────────────────────────────────────

  async payByBalance(orderId: string, userId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException({ code: 50001, message: '订单不存在' });
    if (order.status !== 'pending') {
      throw new ConflictException({ code: 30002, message: '订单状态不允许支付' });
    }
    if (order.userId !== userId) {
      throw new ConflictException({ code: 30015, message: '无权支付他人订单' });
    }

    await this.balanceService.addBalance({
      userId,
      amount: -order.amount,
      type: 'pay_order',
      refId: order.id,
      note: `余额支付组卷订单`,
    });

    const now = new Date();
    await this.orderRepo.update(orderId, { status: 'paid', paidAt: now });

    const paper = await this.paperRepo.findOne({ where: { id: order.paperId } });
    if (paper) {
      await this.paperRepo.update(order.paperId, { status: 'paid' });
    }

    return { code: 'SUCCESS', message: '余额支付成功' };
  }

  // ── 统一下单（支付宝） ─────────────────────────────────────

  async createAlipayPayment(orderId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    const paper = order ? await this.paperRepo.findOne({ where: { id: order.paperId } }) : null;
    if (!order) throw new NotFoundException({ code: 50001, message: '订单不存在' });
    if (order.status !== 'pending') {
      throw new ConflictException({ code: 30002, message: '订单状态不允许支付' });
    }

    const existing = await this.paymentRepo.findOne({
      where: { orderId, status: 'created' },
    });
    if (existing) {
      return { paymentId: existing.id, payForm: null };
    }

    const outTradeNo = this.generateOutTradeNo();
    const result = await this.alipayProvider.createPayment({
      outTradeNo,
      amount: order.amount,
      subject: paper?.title ?? 'AI智能组卷',
    });

    await this.paymentRepo.save(
      this.paymentRepo.create({
        orderId,
        outTradeNo,
        amount: order.amount,
        status: 'created',
        provider: 'alipay',
      }),
    );

    return { payForm: result.payForm, paymentId: undefined };
  }

  // ── 支付宝回调 ─────────────────────────────────────────────

  async handleAlipayCallback(data: Record<string, string>) {
    const result = await this.alipayProvider.verifyCallback(data);
    if (!result.success) return { code: 'FAIL', message: 'Trade not success' };

    const payment = await this.paymentRepo.findOne({
      where: { outTradeNo: result.outTradeNo },
    });

    if (!payment) return { code: 'FAIL', message: 'Payment record not found' };
    if (payment.status === 'success') return { code: 'SUCCESS', message: 'OK' };

    const now = new Date();
    await this.paymentRepo.update(payment.id, {
      status: 'success',
      transactionId: result.transactionId,
      callbackRaw: data as any,
      paidAt: now,
    });

    await this.orderRepo.update(payment.orderId, { status: 'paid', paidAt: now });

    const order = await this.orderRepo.findOne({ where: { id: payment.orderId } });
    if (order) {
      await this.paperRepo.update(order.paperId, { status: 'paid' });
    }

    return { code: 'SUCCESS', message: 'OK' };
  }

  // ── 支付回调（微信，保留兼容） ─────────────────────────────

  async handleWxCallback(headers: Record<string, string>, body: any) {
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    if (!this.wxPayClient.verifySignature(headers, rawBody)) {
      throw new ConflictException({ code: 30003, message: '回调签名验证失败' });
    }

    let callback: Record<string, any>;
    try {
      const resource = body?.resource;
      if (resource) {
        callback = this.wxPayClient.decryptResource(
          resource.ciphertext, resource.associated_data, resource.nonce,
        );
      } else {
        callback = body;
      }
    } catch {
      throw new ConflictException({ code: 30003, message: '回调数据解密失败' });
    }

    if (callback.trade_state !== 'SUCCESS') {
      return { code: 'FAIL', message: `Trade state: ${callback.trade_state}` };
    }

    const payment = await this.paymentRepo.findOne({
      where: { outTradeNo: callback.out_trade_no },
    });
    if (!payment) return { code: 'FAIL', message: 'Payment record not found' };
    if (payment.status === 'success') return { code: 'SUCCESS', message: 'OK' };

    const now = new Date();
    await this.paymentRepo.update(payment.id, {
      status: 'success',
      transactionId: callback.transaction_id,
      callbackRaw: body,
      paidAt: now,
    });

    await this.orderRepo.update(payment.orderId, { status: 'paid', paidAt: now });

    const order = await this.orderRepo.findOne({ where: { id: payment.orderId } });
    if (order) {
      await this.paperRepo.update(order.paperId, { status: 'paid' });
    }

    return { code: 'SUCCESS', message: 'OK' };
  }

  // ── 支付状态查询 ───────────────────────────────────────────

  async getPaymentStatus(orderId: string, userId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException({ code: 50001, message: '订单不存在' });
    return { orderId: order.id, status: order.status, paidAt: order.paidAt };
  }

  // ── Dev: 模拟支付 ─────────────────────────────────────────

  async mockPay(orderId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException({ code: 50001, message: '订单不存在' });

    const payment = await this.paymentRepo.findOne({ where: { orderId } });
    const now = new Date();

    if (payment) {
      await this.paymentRepo.update(payment.id, {
        status: 'success',
        transactionId: `dev_txn_${Date.now()}`,
        paidAt: now,
      });
    }

    await this.orderRepo.update(orderId, { status: 'paid', paidAt: now });
    await this.paperRepo.update(order.paperId, { status: 'paid' });

    return { code: 'SUCCESS', message: 'Mock payment completed' };
  }

  private generateOutTradeNo(): string {
    const now = new Date();
    const ts = [
      now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'), String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'), String(now.getSeconds()).padStart(2, '0'),
    ].join('');
    const rand = Math.random().toString().slice(2, 8);
    return `${ts}${rand}`;
  }
}
