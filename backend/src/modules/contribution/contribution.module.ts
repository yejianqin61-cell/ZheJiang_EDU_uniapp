import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KbFile } from '../../database/entities/kb-file.entity';
import { Question } from '../../database/entities/question.entity';
import { KnowledgePoint } from '../../database/entities/knowledge-point.entity';
import { QuestionKnowledge } from '../../database/entities/question-knowledge.entity';
import { ContributionService } from './services/contribution.service';
import { ContributionController } from './contribution.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([KbFile, Question, KnowledgePoint, QuestionKnowledge]),
  ],
  controllers: [ContributionController],
  providers: [ContributionService],
  exports: [ContributionService],
})
export class ContributionModule {}
