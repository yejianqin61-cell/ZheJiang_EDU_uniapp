import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('payment')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'wx_transaction_id' })
  wxTransactionId: string | null;

  @Column({ type: 'varchar', length: 32, unique: true, name: 'wx_out_trade_no' })
  wxOutTradeNo: string;

  @Column({ type: 'integer' })
  amount: number;

  @Column({ type: 'varchar', length: 32, default: 'created' })
  status: string; // created | success | failed | refund

  @Column({ type: 'jsonb', nullable: true, name: 'callback_raw' })
  callbackRaw: Record<string, any> | null;

  @Column({ type: 'timestamp', nullable: true, name: 'paid_at' })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
