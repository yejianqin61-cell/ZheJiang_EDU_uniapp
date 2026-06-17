import { Controller, Get, Delete, Post, Put, Param, Query, Body, UseGuards } from '@nestjs/common';
import { IsArray } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './services/dashboard.service';
import { QuestionManageService } from './services/question-manage.service';
import { SeedService } from './services/seed.service';
import { BulkSeedService } from './services/bulk-seed.service';
import { PricingService } from '../print/services/pricing.service';
import { PrintOrderService } from '../print/services/print-order.service';
import { UpdatePricingDto } from '../print/dto/update-pricing.dto';
import { UpdatePrintStatusDto } from '../print/dto/update-print-status.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

class BatchDeleteDto {
  @IsArray()
  questionIds: string[];
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly questionManageService: QuestionManageService,
    private readonly seedService: SeedService,
    private readonly bulkSeedService: BulkSeedService,
    private readonly pricingService: PricingService,
    private readonly printOrderService: PrintOrderService,
  ) {}

  // === Dev: Seed test data ===

  @Post('admin/seed')
  @Roles('admin')
  async seed() {
    return this.seedService.seed();
  }

  // === Bulk seed (LLM-generated questions for all grades) ===

  @Post('admin/seed-subject')
  @Roles('admin')
  async seedSubject(
    @Body('subject') subject: string,
    @Body('perGrade') perGrade?: number,
    @Body('grade') grade?: string,
  ) {
    return this.bulkSeedService.seedSubject(subject, perGrade ?? 5, grade);
  }

  // === User role management ===

  @Post('admin/users/:id/set-role')
  @Roles('admin')
  async setUserRole(@Param('id') userId: string, @Body('role') role: string) {
    return this.seedService.setUserRole(userId, role);
  }

  // === Dashboard ===

  @Get('admin/questions/stats')
  @Roles('admin')
  getStats() {
    return this.dashboardService.getStats();
  }

  // === Question Management ===

  @Get('admin/questions')
  @Roles('admin')
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

  @Get('admin/questions/:id')
  @Roles('admin')
  getQuestionDetail(@Param('id') id: string) {
    return this.questionManageService.detail(id);
  }

  @Delete('admin/questions/:id')
  @Roles('admin')
  deleteQuestion(@Param('id') id: string) {
    return this.questionManageService.softDelete(id);
  }

  @Post('admin/questions/batch-delete')
  @Roles('admin')
  batchDelete(@Body() dto: BatchDeleteDto) {
    return this.questionManageService.batchDelete(dto.questionIds);
  }

  @Post('admin/questions/delete-by-file')
  @Roles('admin')
  deleteByFile(@Body('fileId') fileId: string) {
    return this.questionManageService.deleteByFile(fileId);
  }

  // === Pricing Configuration ===

  @Get('admin/pricing')
  @Roles('admin')
  getPricing() {
    return this.pricingService.getPricingConfig();
  }

  @Put('admin/pricing')
  @Roles('admin')
  updatePricing(@Body() dto: UpdatePricingDto, @CurrentUser('id') userId: string) {
    return this.pricingService.updatePricing(dto as any, userId);
  }

  // ── Public pricing endpoint (no auth) ──

  @Get('pricing/public')
  @Public()
  getPublicPricing() {
    return this.pricingService.getPricingConfig();
  }

  // === Print Order Management ===

  @Put('admin/orders/:id/print-status')
  @Roles('admin')
  updatePrintStatus(@Param('id') id: string, @Body() dto: UpdatePrintStatusDto) {
    const status = dto.printStatus === 'null' ? null : (dto.printStatus ?? null);
    return this.printOrderService.updatePrintStatus(id, status);
  }

}
