import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Paper } from './paper.entity';
import { ShippingAddress } from './shipping-address.entity';

@Entity('order')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', name: 'paper_id' })
  paperId: string;

  @ManyToOne(() => Paper, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paper_id' })
  paper: Paper;

  @Column({ type: 'varchar', length: 32, unique: true, name: 'order_no' })
  orderNo: string;

  // ── New fields for dual-mode ──────────────────────────────

  @Column({ type: 'varchar', length: 16, default: 'download' })
  type: 'download' | 'print' | 'exercise';

  @Column({ type: 'integer', nullable: true })
  copies: number | null;

  @Column({ type: 'varchar', nullable: true, name: 'shipping_address_id' })
  shippingAddressId: string | null;

  @ManyToOne(() => ShippingAddress, { nullable: true })
  @JoinColumn({ name: 'shipping_address_id' })
  shippingAddress: ShippingAddress | null;

  @Column({ type: 'varchar', nullable: true, name: 'exercise_paper_id' })
  exercisePaperId: string | null;

  @Column({ type: 'simple-json', nullable: true, name: 'shipping_snapshot' })
  shippingSnapshot: Record<string, any> | null;

  @Column({ type: 'simple-json', nullable: true, name: 'pricing_snapshot' })
  pricingSnapshot: Record<string, any> | null;

  @Column({ type: 'integer', default: 0, name: 'unit_price' })
  unitPrice: number; // cents

  @Column({ type: 'varchar', length: 32, nullable: true, name: 'print_status' })
  printStatus: 'printing' | 'shipped' | 'delivered' | null;

  // ── Existing fields ───────────────────────────────────────

  @Column({ type: 'integer' })
  amount: number; // cents

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: string; // pending | paid | cancelled | expired

  @Column({ type: 'datetime', nullable: true, name: 'paid_at' })
  paidAt: Date | null;

  @Column({ type: 'datetime', name: 'expired_at' })
  expiredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
