import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { KbFile } from './kb-file.entity';

@Entity('ocr_task')
export class OcrTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'file_id' })
  fileId: string;

  @ManyToOne(() => KbFile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: KbFile;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true, name: 'result_text' })
  resultText: string | null;

  @Column({ type: 'integer', nullable: true, name: 'page_count' })
  pageCount: number | null;

  @Column({ type: 'integer', nullable: true, name: 'duration_ms' })
  durationMs: number | null;

  @Column({ type: 'text', nullable: true, name: 'error_msg' })
  errorMsg: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
