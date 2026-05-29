import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('knowledge_point')
export class KnowledgePoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'varchar', length: 32 })
  subject: string;

  @Column({ type: 'varchar', length: 32 })
  grade: string;

  // pgvector column — managed via raw SQL
  // @Column({ type: 'vector', length: 1536, nullable: true })
  // embedding: number[] | null;

  @Column({ type: 'integer', default: 0, name: 'question_count' })
  questionCount: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
