import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { WxPayClient } from './wxpay.client';
import { AlipayProvider } from './providers/alipay.provider';
import { Payment } from '../../database/entities/payment.entity';
import { Order } from '../../database/entities/order.entity';
import { Paper } from '../../database/entities/paper.entity';
import { BalanceModule } from '../balance/balance.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Order, Paper]), BalanceModule],
  controllers: [PaymentController],
  providers: [PaymentService, WxPayClient, AlipayProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
