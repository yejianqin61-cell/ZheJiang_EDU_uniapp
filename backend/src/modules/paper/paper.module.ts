import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaperController } from './paper.controller';
import { PaperService } from './paper.service';
import { RetrievalService } from './services/retrieval.service';
import { GenerationService } from './services/generation.service';
import { Paper } from '../../database/entities/paper.entity';
import { PaperQuestionSnapshot } from '../../database/entities/paper-question-snapshot.entity';
import { Question } from '../../database/entities/question.entity';
import { KnowledgePoint } from '../../database/entities/knowledge-point.entity';
import { QuestionKnowledge } from '../../database/entities/question-knowledge.entity';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Paper, PaperQuestionSnapshot, Question, KnowledgePoint, QuestionKnowledge]),
    KnowledgeBaseModule,
  ],
  controllers: [PaperController],
  providers: [PaperService, RetrievalService, GenerationService],
})
export class PaperModule {}
