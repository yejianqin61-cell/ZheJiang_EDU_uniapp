import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { ImageUploadController } from './upload/image-upload.controller';
import { DashboardService } from './services/dashboard.service';
import { QuestionManageService } from './services/question-manage.service';
import { Question } from '../../database/entities/question.entity';
import { QuestionKnowledge } from '../../database/entities/question-knowledge.entity';
import { KnowledgePoint } from '../../database/entities/knowledge-point.entity';
import { KbFile } from '../../database/entities/kb-file.entity';
import { User } from '../../database/entities/user.entity';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { SeedService } from './services/seed.service';
import { BulkSeedService } from './services/bulk-seed.service';
import { PrintModule } from '../print/print.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Question, QuestionKnowledge, KnowledgePoint, KbFile, User]),
    KnowledgeBaseModule,
    PrintModule,
  ],
  controllers: [AdminController, ImageUploadController],
  providers: [DashboardService, QuestionManageService, SeedService, BulkSeedService],
})
export class AdminModule {}
