import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Payment } from '../../database/entities/payment.entity';
import { Order } from '../../database/entities/order.entity';
import { Paper } from '../../database/entities/paper.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Order, Paper])],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
