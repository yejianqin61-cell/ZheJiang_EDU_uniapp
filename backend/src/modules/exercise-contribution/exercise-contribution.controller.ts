import {
  Controller, Get, Post, Delete, Param, Body, Query, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsString, IsOptional, IsIn } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExerciseContributionService } from './services/exercise-contribution.service';

class UploadDto {
  @IsString() title: string;
  @IsString() subject: string;
  @IsString() grade: string;
  @IsString() @IsIn(['sync', 'unit', 'topic', 'exam']) exerciseType: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() lessonId?: string;
}

class BatchDto {
  @IsString({ each: true }) ids: string[];
  @IsString() @IsIn(['approve', 'reject']) action: string;
  @IsOptional() @IsString() note?: string;
}

@Controller('exercise-contributions')
@UseGuards(JwtAuthGuard)
export class ExerciseContributionController {
  constructor(private readonly service: ExerciseContributionService) {}

  // ── Teacher endpoints ────────────────────────────────────

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDto,
  ) {
    if (!file) throw new BadRequestException({ code: 60004, message: '请上传文件' });
    if (!dto.title) throw new BadRequestException({ code: 60005, message: '请输入试卷标题' });
    if (!dto.subject || !dto.grade) throw new BadRequestException({ code: 60006, message: '请选择学科和年级' });
    if (!dto.exerciseType) throw new BadRequestException({ code: 60007, message: '请选择练习类型' });

    return this.service.upload(userId, {
      filename: file.originalname,
      buffer: file.buffer,
      size: file.size,
    }, dto);
  }

  @Get()
  listMy(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('status') status?: string,
  ) {
    return this.service.listMyUploads(userId, page || 1, pageSize || 20, status);
  }

  @Get('categories')
  listCategories(
    @Query('grade') grade?: string,
    @Query('subject') subject?: string,
    @Query('exerciseType') exerciseType?: string,
  ) {
    return this.service.listCategories(grade, subject, exerciseType);
  }

  @Get('lessons')
  listLessons(@Query('categoryId') categoryId: string) {
    if (!categoryId) throw new BadRequestException({ code: 60008, message: '请提供类目ID' });
    return this.service.listLessons(categoryId);
  }

  @Get(':id')
  getDetail(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.getDetail(id, userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.delete(id, userId);
  }

  // ── Admin endpoints ──────────────────────────────────────

  @Get('admin/list')
  @UseGuards(RolesGuard)
  @Roles('admin')
  listAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('status') status?: string,
    @Query('subject') subject?: string,
    @Query('grade') grade?: string,
    @Query('exerciseType') exerciseType?: string,
  ) {
    return this.service.listAll({ page: page || 1, pageSize: pageSize || 20, status, subject, grade, exerciseType });
  }

  @Post('admin/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('admin')
  approve(@Param('id') id: string, @CurrentUser('id') reviewerId: string) {
    return this.service.approve(id, reviewerId);
  }

  @Post('admin/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('admin')
  reject(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body('note') note?: string,
  ) {
    return this.service.reject(id, reviewerId, note);
  }

  @Post('admin/batch')
  @UseGuards(RolesGuard)
  @Roles('admin')
  batch(@Body() dto: BatchDto, @CurrentUser('id') reviewerId: string) {
    if (dto.action === 'approve') {
      return this.service.batchApprove(dto.ids, reviewerId);
    }
    return this.service.batchReject(dto.ids, reviewerId, dto.note);
  }
}
