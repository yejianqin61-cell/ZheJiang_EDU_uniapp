import { Controller, Get, Delete, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { IsArray, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DashboardService } from './services/dashboard.service';
import { QuestionManageService } from './services/question-manage.service';
import { FileManageService } from './services/file-manage.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

class BatchDeleteDto {
  @IsArray()
  questionIds: string[];
}

class DeleteByFileDto {
  @IsString()
  fileId: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly questionManageService: QuestionManageService,
    private readonly fileManageService: FileManageService,
  ) {}

  // === Dashboard ===

  @Get('questions/stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  // === Question Management ===

  @Get('questions')
  listQuestions(
    @Query() pagination: PaginationDto,
    @Query('subject') subject?: string,
    @Query('grade') grade?: string,
    @Query('difficulty') difficulty?: number,
    @Query('knowledgePointId') knowledgePointId?: string,
    @Query('fileId') fileId?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.questionManageService.list({
      page: pagination.page!,
      pageSize: pagination.pageSize!,
      subject,
      grade,
      difficulty: difficulty ? Number(difficulty) : undefined,
      knowledgePointId,
      fileId,
      keyword,
    });
  }

  @Get('questions/:id')
  getQuestionDetail(@Param('id') id: string) {
    return this.questionManageService.detail(id);
  }

  @Delete('questions/:id')
  deleteQuestion(@Param('id') id: string) {
    return this.questionManageService.softDelete(id);
  }

  @Post('questions/batch-delete')
  batchDelete(@Body() dto: BatchDeleteDto) {
    return this.questionManageService.batchDelete(dto.questionIds);
  }

  @Post('questions/delete-by-file')
  deleteByFile(@Body() dto: DeleteByFileDto) {
    return this.questionManageService.deleteByFile(dto.fileId);
  }

  // === File Management ===

  @Get('files')
  listFiles(
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.fileManageService.list(pagination.page!, pagination.pageSize!, status);
  }

  @Delete('files/:id')
  deleteFile(@Param('id') id: string) {
    return this.fileManageService.delete(id);
  }
}
