import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('paper')
export class Paper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 256 })
  title: string;

  @Column({ type: 'jsonb' })
  conditions: Record<string, any>;

  @Column({ type: 'uuid', array: true, name: 'question_ids' })
  questionIds: string[];

  @Column({ type: 'integer', default: 100, name: 'total_score' })
  totalScore: number;

  @Column({ type: 'integer', nullable: true, name: 'generate_ms' })
  generateMs: number | null;

  @Column({ type: 'varchar', length: 32, default: 'draft' })
  status: string; // draft | paid | exported

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'export_docx_url' })
  exportDocxUrl: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'export_pdf_url' })
  exportPdfUrl: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'exported_at' })
  exportedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
