import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Order } from '../../database/entities/order.entity';
import { Paper } from '../../database/entities/paper.entity';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Paper]),
    ScheduleModule.forRoot(),
    PaymentModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
