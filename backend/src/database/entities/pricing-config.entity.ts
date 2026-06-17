import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('pricing_config')
@Unique(['type', 'tier'])
export class PricingConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 16 })
  type: 'download' | 'print' | 'cashback';

  @Column({ type: 'smallint', default: 1 })
  tier: number;

  @Column({ type: 'integer', nullable: true, name: 'min_quantity' })
  minQuantity: number | null;

  @Column({ type: 'integer', nullable: true, name: 'max_quantity' })
  maxQuantity: number | null;

  @Column({ type: 'integer', name: 'unit_price' })
  unitPrice: number; // cents

  @Column({ type: 'varchar', nullable: true, name: 'updated_by' })
  updatedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
