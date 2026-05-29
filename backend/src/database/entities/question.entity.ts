import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { KbFile } from './kb-file.entity';
import { User } from './user.entity';

@Entity('question')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32 })
  type: string; // single_choice | multi_choice | true_false | fill_blank | short_answer

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  options: string[] | null;

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'text', nullable: true })
  analysis: string | null;

  @Column({ type: 'smallint' })
  difficulty: number; // 1 | 2 | 3

  @Column({ type: 'varchar', length: 32 })
  subject: string;

  @Column({ type: 'varchar', length: 32 })
  grade: string;

  @Column({ type: 'uuid', nullable: true, name: 'source_file_id' })
  sourceFileId: string | null;

  @ManyToOne(() => KbFile, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_file_id' })
  sourceFile: KbFile | null;

  @Column({ type: 'varchar', length: 32, default: 'parsed' })
  status: string; // parsed | approved | rejected

  // pgvector column — managed via raw SQL until TypeORM supports vector natively
  // @Column({ type: 'vector', length: 1536, nullable: true })
  // embedding: number[] | null;

  @Column({ type: 'boolean', default: false, name: 'is_deleted' })
  isDeleted: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by' })
  reviewedById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy: User | null;

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
