import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Paper } from './paper.entity';
import { Question } from './question.entity';

@Entity('paper_question_snapshot')
export class PaperQuestionSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'paper_id' })
  paperId: string;

  @ManyToOne(() => Paper, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paper_id' })
  paper: Paper;

  @Column({ type: 'integer', name: 'sort_order' })
  sortOrder: number;

  @Column({ type: 'varchar', nullable: true, name: 'question_id' })
  questionId: string | null;

  @ManyToOne(() => Question, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'question_id' })
  question: Question | null;

  @Column({ type: 'simple-json' })
  snapshot: Record<string, any>;
}
