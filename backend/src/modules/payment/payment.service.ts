import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../../database/entities/payment.entity';
import { Order } from '../../database/entities/order.entity';
import { Paper } from '../../database/entities/paper.entity';
import { WxPayClient } from './wxpay.client';

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
  ) {}

  // ── PM-01: 统一下单 ───────────────────────────────────────

  /**
   * Create a payment record and call WeChat Pay unifiedOrder.
   * Returns wxPayParams for frontend wx.requestPayment().
   */
  async createPayment(orderId: string, openid: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    const paper = order ? await this.paperRepo.findOne({ where: { id: order.paperId } }) : null;
    if (!order) throw new NotFoundException({ code: 50001, message: '订单不存在' });
    if (order.status !== 'pending') {
      throw new ConflictException({ code: 30002, message: '订单状态不允许支付' });
    }

    // Check existing payment
    const existing = await this.paymentRepo.findOne({
      where: { orderId, status: 'created' },
    });
    if (existing) {
      // Return existing payment params (retry scenario)
      return {
        paymentId: existing.id,
        wxPayParams: null, // Would need to re-generate or return cached
      };
    }

    // Call WeChat Pay
    const outTradeNo = this.generateOutTradeNo();
    let wxPayParams: Record<string, string> | null = null;

    try {
      const result = await this.wxPayClient.unifiedOrder({
        outTradeNo,
        amount: order.amount,
        description: paper?.title ?? 'AI智能组卷',
        openid,
      });
      wxPayParams = result.wxPayParams;
    } catch (err: any) {
      // Save failed payment record for audit
      await this.paymentRepo.save(
        this.paymentRepo.create({
          orderId,
          wxOutTradeNo: outTradeNo,
          amount: order.amount,
          status: 'failed',
        }),
      );
      throw new ConflictException({ code: 30003, message: `微信支付下单失败: ${err.message}` });
    }

    // Save payment record
    await this.paymentRepo.save(
      this.paymentRepo.create({
        orderId,
        wxOutTradeNo: outTradeNo,
        amount: order.amount,
        status: 'created',
      }),
    );

    return { wxPayParams };
  }

  // ── PM-03: 支付回调 ───────────────────────────────────────

  /**
   * Handle WeChat Pay callback notification.
   */
  async handleCallback(headers: Record<string, string>, body: any) {
    // Step 1: Verify signature
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    if (!this.wxPayClient.verifySignature(headers, rawBody)) {
      throw new ConflictException({ code: 30003, message: '回调签名验证失败' });
    }

    // Step 2: Decrypt resource
    let callback: Record<string, any>;

    try {
      const resource = body?.resource;
      if (resource) {
        callback = this.wxPayClient.decryptResource(
          resource.ciphertext,
          resource.associated_data,
          resource.nonce,
        );
      } else {
        // Dev mode: body is plaintext
        callback = body;
      }
    } catch {
      throw new ConflictException({ code: 30003, message: '回调数据解密失败' });
    }

    if (callback.trade_state !== 'SUCCESS') {
      return { code: 'FAIL', message: `Trade state: ${callback.trade_state}` };
    }

    // Step 3: Look up payment
    const payment = await this.paymentRepo.findOne({
      where: { wxOutTradeNo: callback.out_trade_no },
    });

    if (!payment) {
      // Payment record not found — may have been created externally
      return { code: 'FAIL', message: 'Payment record not found' };
    }

    // Dedup: already processed
    if (payment.status === 'success') {
      return { code: 'SUCCESS', message: 'OK' };
    }

    // Amount validation
    if (payment.amount !== callback.amount.total) {
      return { code: 'FAIL', message: 'Amount mismatch' };
    }

    // Only pending/created payments can be marked success
    if (payment.status !== 'created') {
      return { code: 'FAIL', message: `Invalid payment status: ${payment.status}` };
    }

    const now = new Date();

    // Step 4: Update payment
    await this.paymentRepo.update(payment.id, {
      status: 'success',
      wxTransactionId: callback.transaction_id,
      callbackRaw: body,
      paidAt: now,
    });

    // Step 5: Update order
    await this.orderRepo.update(payment.orderId, {
      status: 'paid',
      paidAt: now,
    });

    // Step 6: Update paper
    const order = await this.orderRepo.findOne({ where: { id: payment.orderId } });
    if (order) {
      await this.paperRepo.update(order.paperId, { status: 'paid' });
    }

    return { code: 'SUCCESS', message: 'OK' };
  }

  // ── PM-04: 支付状态查询 ───────────────────────────────────

  async getPaymentStatus(orderId: string, userId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId },
    });
    if (!order) throw new NotFoundException({ code: 50001, message: '订单不存在' });

    return {
      orderId: order.id,
      status: order.status,
      paidAt: order.paidAt,
    };
  }

  // ── Dev: 模拟支付成功 ─────────────────────────────────────

  /**
   * Dev-only: simulate successful payment without WeChat Pay.
   */
  async mockPay(orderId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException({ code: 50001, message: '订单不存在' });

    const payment = await this.paymentRepo.findOne({ where: { orderId } });
    const now = new Date();

    if (payment) {
      await this.paymentRepo.update(payment.id, {
        status: 'success',
        wxTransactionId: `dev_txn_${Date.now()}`,
        paidAt: now,
      });
    }

    await this.orderRepo.update(orderId, { status: 'paid', paidAt: now });
    await this.paperRepo.update(order.paperId, { status: 'paid' });

    return { code: 'SUCCESS', message: 'Mock payment completed' };
  }

  // ── Helpers ───────────────────────────────────────────────

  private generateOutTradeNo(): string {
    const now = new Date();
    const ts = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');
    const rand = Math.random().toString().slice(2, 8);
    return `${ts}${rand}`;
  }
}
