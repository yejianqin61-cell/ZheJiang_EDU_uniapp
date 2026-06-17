import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('kb_file')
export class KbFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'uploader_id' })
  uploaderId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploader_id' })
  uploader: User;

  @Column({ type: 'varchar', length: 256 })
  filename: string;

  @Column({ type: 'varchar', length: 16, name: 'file_type' })
  fileType: string;

  @Column({ type: 'integer', name: 'file_size' })
  fileSize: number;

  @Column({ type: 'varchar', length: 32 })
  subject: string;

  @Column({ type: 'varchar', length: 32 })
  grade: string;

  @Column({ type: 'varchar', length: 512, name: 'cos_url' })
  cosUrl: string;

  @Column({ type: 'varchar', length: 32, default: 'uploading' })
  status: string;

  @Column({ type: 'integer', default: 0, name: 'question_count' })
  questionCount: number;

  @Column({ type: 'text', nullable: true, name: 'error_msg' })
  errorMsg: string | null;

  @Column({ type: 'varchar', length: 32, default: 'draft', name: 'submit_status' })
  submitStatus: 'draft' | 'pending_review' | 'reviewed';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
