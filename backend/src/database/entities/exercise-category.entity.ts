import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { User } from './user.entity'

@Entity('exercise_category')
export class ExerciseCategory {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column({ type: 'varchar', length: 16 })
  type: string // 'unit' | 'topic' | 'exam'

  @Column({ type: 'varchar', length: 32 }) grade: string
  @Column({ type: 'varchar', length: 32 }) subject: string
  @Column({ type: 'varchar', length: 128 }) name: string
  @Column({ type: 'varchar', length: 32, nullable: true }) term: string | null
  @Column({ type: 'varchar', length: 32, nullable: true, name: 'exam_type' }) examType: string | null
  @Column({ type: 'integer', default: 0, name: 'sort_order' }) sortOrder: number

  @Column({ type: 'varchar', nullable: true, name: 'created_by' }) createdBy: string | null
  @ManyToOne(() => User, { nullable: true }) @JoinColumn({ name: 'created_by' }) creator: User | null

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date
}
