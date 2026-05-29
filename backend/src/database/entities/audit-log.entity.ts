import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, name: 'user_id' })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'varchar', length: 64 })
  action: string;

  @Column({ type: 'varchar', length: 64 })
  resource: string;

  @Column({ type: 'varchar', nullable: true, name: 'resource_id' })
  resourceId: string | null;

  @Column({ type: 'simple-json', nullable: true })
  detail: Record<string, any> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
