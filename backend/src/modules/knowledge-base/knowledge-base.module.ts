import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { UploadService } from './services/upload.service';
import { OCRService } from './services/ocr.service';
import { SplitterService } from './services/splitter.service';
import { TaggerService } from './services/tagger.service';
import { KnowledgeService } from './services/knowledge.service';
import { ReviewService } from './services/review.service';
import { KbFile } from '../../database/entities/kb-file.entity';
import { OcrTask } from '../../database/entities/ocr-task.entity';
import { Question } from '../../database/entities/question.entity';
import { KnowledgePoint } from '../../database/entities/knowledge-point.entity';
import { QuestionKnowledge } from '../../database/entities/question-knowledge.entity';

const imports: any[] = [
  TypeOrmModule.forFeature([KbFile, OcrTask, Question, KnowledgePoint, QuestionKnowledge]),
];

// BullMQ requires Redis. Skip queue in local dev without Redis.
if (process.env.REDIS_HOST) {
  imports.push(BullModule.registerQueue({ name: 'kb-processing' }));
}

@Module({
  imports,
  controllers: [KnowledgeBaseController],
  providers: [UploadService, OCRService, SplitterService, TaggerService, KnowledgeService, ReviewService],
  exports: [UploadService],
})
export class KnowledgeBaseModule {}
