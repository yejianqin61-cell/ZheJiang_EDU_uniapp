import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaperController } from './paper.controller';
import { PaperService } from './paper.service';
import { Paper } from '../../database/entities/paper.entity';
import { PaperQuestionSnapshot } from '../../database/entities/paper-question-snapshot.entity';
import { Question } from '../../database/entities/question.entity';
import { KnowledgePoint } from '../../database/entities/knowledge-point.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Paper, PaperQuestionSnapshot, Question, KnowledgePoint]),
  ],
  controllers: [PaperController],
  providers: [PaperService],
})
export class PaperModule {}
