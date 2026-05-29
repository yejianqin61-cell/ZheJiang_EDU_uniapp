import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../../database/entities/payment.entity';
import { Order } from '../../database/entities/order.entity';
import { Paper } from '../../database/entities/paper.entity';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Paper)
    private readonly paperRepo: Repository<Paper>,
  ) {}

  async getPaymentStatus(orderId: string, userId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId },
      relations: ['payment'],
    });
    if (!order) throw new NotFoundException({ code: 50001, message: '订单不存在' });

    return {
      orderId: order.id,
      status: order.status,
      paidAt: order.paidAt,
    };
  }

  async handleCallback(body: any) {
    // TODO:
    // 1. Verify WeChat Pay signature
    // 2. Decrypt callback data
    // 3. Lookup payment by wx_out_trade_no
    // 4. Update payment.status = 'success'
    // 5. Update order.status = 'paid', order.paid_at
    // 6. Update paper.status = 'paid'
    return { code: 'SUCCESS', message: 'OK' };
  }
}
