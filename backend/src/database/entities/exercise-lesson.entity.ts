import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { ExerciseCategory } from './exercise-category.entity'
import { User } from './user.entity'

@Entity('exercise_lesson')
export class ExerciseLesson {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column({ type: 'varchar', name: 'unit_id' }) unitId: string
  @ManyToOne(() => ExerciseCategory, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'unit_id' }) unit: ExerciseCategory

  @Column({ type: 'varchar', length: 128 }) name: string
  @Column({ type: 'integer', default: 0, name: 'sort_order' }) sortOrder: number

  @Column({ type: 'varchar', nullable: true, name: 'created_by' }) createdBy: string | null
  @ManyToOne(() => User, { nullable: true }) @JoinColumn({ name: 'created_by' }) creator: User | null

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
}
