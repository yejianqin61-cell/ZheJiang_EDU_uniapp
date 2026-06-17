import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('balance_log')
export class BalanceLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'integer' })
  amount: number; // positive=earn, negative=spend

  @Column({ type: 'varchar', length: 32 })
  type: 'cashback' | 'pay_order' | 'withdraw' | 'admin_adjust';

  @Column({ type: 'varchar', nullable: true, name: 'ref_id' })
  refId: string | null;

  @Column({ type: 'integer', name: 'balance_after' })
  balanceAfter: number;

  @Column({ type: 'varchar', length: 256, nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
