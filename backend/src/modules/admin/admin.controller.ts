import { Controller, Get, Delete, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { IsArray } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DashboardService } from './services/dashboard.service';
import { QuestionManageService } from './services/question-manage.service';
import { SeedService } from './services/seed.service';
import { BulkSeedService } from './services/bulk-seed.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

class BatchDeleteDto {
  @IsArray()
  questionIds: string[];
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly questionManageService: QuestionManageService,
    private readonly seedService: SeedService,
    private readonly bulkSeedService: BulkSeedService,
  ) {}

  // === Dev: Seed test data ===

  @Post('seed')
  async seed() {
    return this.seedService.seed();
  }

  // === Bulk seed (LLM-generated questions for all grades) ===

  @Post('seed-subject')
  async seedSubject(
    @Body('subject') subject: string,
    @Body('perGrade') perGrade?: number,
    @Body('grade') grade?: string,
  ) {
    return this.bulkSeedService.seedSubject(subject, perGrade ?? 5, grade);
  }

  // === User role management ===

  @Post('users/:id/set-role')
  async setUserRole(@Param('id') userId: string, @Body('role') role: string) {
    return this.seedService.setUserRole(userId, role);
  }

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
  deleteByFile(@Body('fileId') fileId: string) {
    return this.questionManageService.deleteByFile(fileId);
  }
}
