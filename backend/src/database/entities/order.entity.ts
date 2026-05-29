import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Paper } from './paper.entity';

@Entity('order')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', name: 'paper_id' })
  paperId: string;

  @ManyToOne(() => Paper)
  @JoinColumn({ name: 'paper_id' })
  paper: Paper;

  @Column({ type: 'varchar', length: 32, unique: true, name: 'order_no' })
  orderNo: string;

  @Column({ type: 'integer' })
  amount: number; // cents

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: string; // pending | paid | cancelled | expired

  @Column({ type: 'timestamp', nullable: true, name: 'paid_at' })
  paidAt: Date | null;

  @Column({ type: 'timestamp', name: 'expired_at' })
  expiredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
