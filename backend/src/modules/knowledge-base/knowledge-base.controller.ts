import {
  Controller, Get, Post, Param, Query, Body, UseGuards, UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadService } from './services/upload.service';
import { ReviewService } from './services/review.service';
import { KnowledgeService } from './services/knowledge.service';
import { PipelineService } from './services/pipeline.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class KnowledgeBaseController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly reviewService: ReviewService,
    private readonly knowledgeService: KnowledgeService,
    private readonly pipelineService: PipelineService,
  ) {}

  // === File Upload (teacher + admin) ===

  @Post('files/upload')
  @Roles('teacher', 'admin')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser('id') uploaderId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('subject') subject: string,
    @Body('grade') grade: string,
  ) {
    return this.uploadService.upload(
      uploaderId,
      file,
      subject,
      grade,
      (fileId, rawText, imageBase64) => this.pipelineService.process(fileId, rawText, imageBase64),
    );
  }

  @Get('files')
  async listFiles(
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.uploadService.listFiles(pagination.page!, pagination.pageSize!, status);
  }

  @Get('files/:id')
  @Roles('teacher', 'admin')
  async getFileStatus(@Param('id') id: string) {
    return this.uploadService.getFileStatus(id);
  }

  // === Review ===

  @Get('reviews')
  async getPendingList(
    @Query() pagination: PaginationDto,
    @Query('fileId') fileId?: string,
  ) {
    return this.reviewService.getPendingList(
      { page: pagination.page!, pageSize: pagination.pageSize! },
      fileId,
    );
  }

  @Get('reviews/:id')
  async getReviewDetail(@Param('id') questionId: string) {
    return this.reviewService.getDetail(questionId);
  }

  @Post('reviews/batch')
  async batchReview(
    @CurrentUser('id') reviewerId: string,
    @Body('questionIds') questionIds: string[],
    @Body('action') action: 'approve' | 'reject',
  ) {
    return this.reviewService.batchReview(reviewerId, questionIds, action);
  }

  @Post('reviews/:id/approve')
  async approveQuestion(
    @CurrentUser('id') reviewerId: string,
    @Param('id') questionId: string,
  ) {
    return this.reviewService.batchReview(reviewerId, [questionId], 'approve');
  }

  @Post('reviews/:id/reject')
  async rejectQuestion(
    @CurrentUser('id') reviewerId: string,
    @Param('id') questionId: string,
  ) {
    return this.reviewService.batchReview(reviewerId, [questionId], 'reject');
  }

  // === Knowledge Points (read-only) ===

  @Get('knowledge-points')
  async listKnowledgePoints(
    @Query() pagination: PaginationDto,
    @Query('subject') subject?: string,
    @Query('grade') grade?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.knowledgeService.listKnowledgePoints(
      { page: pagination.page!, pageSize: pagination.pageSize! },
      subject,
      grade,
      keyword,
    );
  }
}
