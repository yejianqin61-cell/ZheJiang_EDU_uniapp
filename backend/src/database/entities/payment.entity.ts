import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('payment')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'varchar', length: 16, default: 'alipay' })
  provider: string;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'transaction_id' })
  transactionId: string | null;

  @Column({ type: 'varchar', length: 32, unique: true, name: 'out_trade_no' })
  outTradeNo: string;

  @Column({ type: 'integer' })
  amount: number;

  @Column({ type: 'varchar', length: 32, default: 'created' })
  status: string; // created | success | failed | refund

  @Column({ type: 'simple-json', nullable: true, name: 'callback_raw' })
  callbackRaw: Record<string, any> | null;

  @Column({ type: 'datetime', nullable: true, name: 'paid_at' })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
