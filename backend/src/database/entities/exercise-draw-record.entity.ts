import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('exercise_draw_record')
export class ExerciseDrawRecord {
  @PrimaryGeneratedColumn('uuid') id: string

  @Column({ type: 'varchar', name: 'user_id' }) userId: string
  @Column({ type: 'varchar', length: 16, name: 'node_type' }) nodeType: string
  @Column({ type: 'varchar', name: 'node_id' }) nodeId: string
  @Column({ type: 'varchar', name: 'paper_id' }) paperId: string

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date
}
