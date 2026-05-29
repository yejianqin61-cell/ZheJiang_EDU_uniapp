import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Question } from './question.entity';
import { KnowledgePoint } from './knowledge-point.entity';

@Entity('question_knowledge')
export class QuestionKnowledge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'question_id' })
  questionId: string;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({ type: 'varchar', name: 'knowledge_point_id' })
  knowledgePointId: string;

  @ManyToOne(() => KnowledgePoint, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'knowledge_point_id' })
  knowledgePoint: KnowledgePoint;

  @Column({ type: 'real', default: 1.0 })
  confidence: number;
}
