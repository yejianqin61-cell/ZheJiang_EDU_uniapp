import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { DashboardService } from './services/dashboard.service';
import { QuestionManageService } from './services/question-manage.service';
import { FileManageService } from './services/file-manage.service';
import { Question } from '../../database/entities/question.entity';
import { KnowledgePoint } from '../../database/entities/knowledge-point.entity';
import { KbFile } from '../../database/entities/kb-file.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Question, KnowledgePoint, KbFile])],
  controllers: [AdminController],
  providers: [DashboardService, QuestionManageService, FileManageService],
})
export class AdminModule {}
