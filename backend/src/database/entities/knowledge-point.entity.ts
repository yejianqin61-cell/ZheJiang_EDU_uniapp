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

  @Column({ type: 'simple-json', nullable: true })
  embedding: number[] | null; // pgvector on prod, JSON text on SQLite dev

  @Column({ type: 'integer', default: 0, name: 'question_count' })
  questionCount: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
