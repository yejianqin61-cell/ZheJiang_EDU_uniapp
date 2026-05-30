import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportController } from './export.controller';
import { DownloadController } from './download.controller';
import { ExportService } from './export.service';
import { LocalFileService } from './services/local-file.service';
import { Paper } from '../../database/entities/paper.entity';
import { PaperQuestionSnapshot } from '../../database/entities/paper-question-snapshot.entity';
import { Order } from '../../database/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Paper, PaperQuestionSnapshot, Order])],
  controllers: [ExportController, DownloadController],
  providers: [ExportService, LocalFileService],
})
export class ExportModule {}
