import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { ExerciseCategory } from './exercise-category.entity'
import { ExerciseLesson } from './exercise-lesson.entity'
import { User } from './user.entity'

@Entity('exercise_paper')
export class ExercisePaper {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column({ type: 'varchar', nullable: true, name: 'category_id' }) categoryId: string | null
  @ManyToOne(() => ExerciseCategory, { onDelete: 'CASCADE', nullable: true }) @JoinColumn({ name: 'category_id' }) category: ExerciseCategory | null

  @Column({ type: 'varchar', nullable: true, name: 'lesson_id' }) lessonId: string | null
  @ManyToOne(() => ExerciseLesson, { onDelete: 'CASCADE', nullable: true }) @JoinColumn({ name: 'lesson_id' }) lesson: ExerciseLesson | null

  @Column({ type: 'varchar', length: 256 }) title: string
  @Column({ type: 'varchar', length: 512, name: 'file_url' }) fileUrl: string
  @Column({ type: 'varchar', length: 8, name: 'file_type' }) fileType: string
  @Column({ type: 'integer', nullable: true, name: 'file_size' }) fileSize: number | null
  @Column({ type: 'integer', nullable: true, name: 'page_count' }) pageCount: number | null
  @Column({ type: 'varchar', length: 512, nullable: true, name: 'thumbnail_url' }) thumbnailUrl: string | null
  @Column({ type: 'integer', default: 0, name: 'download_count' }) downloadCount: number

  @Column({ type: 'varchar', nullable: true, name: 'created_by' }) createdBy: string | null
  @ManyToOne(() => User, { nullable: true }) @JoinColumn({ name: 'created_by' }) creator: User | null

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
}
