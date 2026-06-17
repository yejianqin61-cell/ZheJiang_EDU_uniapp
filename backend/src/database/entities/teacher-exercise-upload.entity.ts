import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('teacher_exercise_upload')
export class TeacherExerciseUpload {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 256 })
  title: string;

  @Column({ type: 'varchar', length: 32 })
  subject: string;

  @Column({ type: 'varchar', length: 32 })
  grade: string;

  @Column({ type: 'varchar', length: 16, name: 'exercise_type' })
  exerciseType: string; // 'sync' | 'unit' | 'topic' | 'exam'

  @Column({ type: 'varchar', nullable: true, name: 'category_id' })
  categoryId: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'lesson_id' })
  lessonId: string | null;

  @Column({ type: 'varchar', length: 1024, name: 'file_url' })
  fileUrl: string;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'thumbnail_url' })
  thumbnailUrl: string | null;

  @Column({ type: 'varchar', length: 16, name: 'file_type' })
  fileType: string;

  @Column({ type: 'integer', nullable: true, name: 'file_size' })
  fileSize: number | null;

  @Column({ type: 'varchar', length: 16, default: 'pending_review' })
  status: string; // 'pending_review' | 'approved' | 'rejected'

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'review_note' })
  reviewNote: string | null;

  @Column({ type: 'integer', default: 0, name: 'cashback_amount' })
  cashbackAmount: number;

  @Column({ type: 'varchar', nullable: true, name: 'reviewed_by' })
  reviewedBy: string | null;

  @Column({ type: 'datetime', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
