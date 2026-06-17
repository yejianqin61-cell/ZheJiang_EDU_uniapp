import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../../database/entities/order.entity';

// Allowed transitions: from → [to...]
// Use string 'null' as key for null print_status
const VALID_TRANSITIONS: Record<string, (string | null)[]> = {
  'null':     ['printing'],
  'printing': ['shipped', null],          // 前进/回退到待处理
  'shipped':  ['delivered', 'printing'],  // 前进/回退到打印中
  'delivered':['shipped'],                // 回退到已发货
};

@Injectable()
export class PrintOrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async updatePrintStatus(orderId: string, newStatus: string | null) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException({ code: 50001, message: '订单不存在' });
    if (order.type !== 'print') {
      throw new BadRequestException({ code: 50002, message: '该订单不是打印订单' });
    }

    const curKey = order.printStatus ?? 'null';
    const allowed = VALID_TRANSITIONS[curKey] ?? [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException({
        code: 50003,
        message: `物流状态不可从「${order.printStatus ?? '待处理'}」变为「${newStatus ?? '待处理'}」`,
      });
    }

    await this.orderRepo.update(orderId, { printStatus: newStatus as any });
  }
}
