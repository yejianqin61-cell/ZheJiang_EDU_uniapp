import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Paper } from './paper.entity';
import { Question } from './question.entity';

@Entity('paper_question_snapshot')
export class PaperQuestionSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'paper_id' })
  paperId: string;

  @ManyToOne(() => Paper, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paper_id' })
  paper: Paper;

  @Column({ type: 'smallint', name: 'sort_order' })
  sortOrder: number;

  @Column({ type: 'uuid', nullable: true, name: 'question_id' })
  questionId: string | null;

  @ManyToOne(() => Question, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'question_id' })
  question: Question | null;

  @Column({ type: 'jsonb' })
  snapshot: Record<string, any>;
}
