import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ExerciseService } from './exercise.service'
import { ThumbnailService } from './services/thumbnail.service'

// ==================== User API ====================
@Controller('exercise')
export class ExercisePublicController {
  constructor(private readonly service: ExerciseService) {}

  @Get('categories')
  async listCategories(@Query('type') type?: string, @Query('grade') grade?: string, @Query('subject') subject?: string) {
    return this.service.listCategories(type, grade, subject)
  }

  @Get('lessons')
  async listLessons(@Query('unitId') unitId: string) {
    return this.service.listLessons(unitId)
  }

  @UseGuards(JwtAuthGuard)
  @Post('categories/:id/draw')
  async drawCategory(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.draw(userId, 'category', id)
  }

  @UseGuards(JwtAuthGuard)
  @Post('lessons/:id/draw')
  async drawLesson(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.draw(userId, 'lesson', id)
  }

  @Get('papers')
  async listPapers(
    @Query('categoryId') categoryId?: string,
    @Query('lessonId') lessonId?: string,
  ) {
    return this.service.listPapers(categoryId, lessonId)
  }

  @Get('papers/:id')
  async getPaper(@Param('id') id: string) {
    return this.service.getPaper(id)
  }
}

// ==================== Admin API ====================
@Controller('admin/exercise')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ExerciseAdminController {
  constructor(
    private readonly service: ExerciseService,
    private readonly thumbnailService: ThumbnailService,
  ) {}

  // Categories
  @Get('categories')
  async listCategories(@Query('type') type?: string, @Query('grade') grade?: string, @Query('subject') subject?: string) {
    return this.service.listCategories(type, grade, subject)
  }

  @Post('categories')
  async createCategory(@Body() dto: any, @CurrentUser('id') userId: string) {
    return this.service.createCategory({ ...dto, createdBy: userId })
  }

  @Put('categories/:id')
  async updateCategory(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateCategory(id, dto)
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return this.service.deleteCategory(id)
  }

  // Lessons
  @Get('lessons')
  async listLessons(@Query('unitId') unitId: string) {
    return this.service.listLessons(unitId)
  }

  @Post('lessons')
  async createLesson(@Body() dto: any, @CurrentUser('id') userId: string) {
    return this.service.createLesson({ ...dto, createdBy: userId })
  }

  @Put('lessons/:id')
  async updateLesson(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateLesson(id, dto)
  }

  @Delete('lessons/:id')
  async deleteLesson(@Param('id') id: string) {
    return this.service.deleteLesson(id)
  }

  // Papers
  @Get('papers')
  async listPapers(@Query('categoryId') categoryId?: string, @Query('lessonId') lessonId?: string) {
    return this.service.listPapers(categoryId, lessonId)
  }

  @Post('papers')
  @UseInterceptors(FileInterceptor('file'))
  async createPaper(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @Body('categoryId') categoryId: string,
    @Body('lessonId') lessonId: string,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) throw new Error('请上传文件')
    const { v4: uuid } = require('uuid')
    const { extname, join } = require('path')
    const { writeFileSync, existsSync, mkdirSync } = require('fs')
    const uploadDir = join(process.cwd(), 'uploads', 'exercises')
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true })
    const filename = `${uuid()}${extname(file.originalname)}`
    writeFileSync(join(uploadDir, filename), file.buffer)
    const fileUrl = `/uploads/exercises/${filename}`
    const fileType = extname(file.originalname).replace('.', '')

    const paper = await this.service.createPaper({
      title,
      categoryId: categoryId || undefined,
      lessonId: lessonId || undefined,
      fileUrl,
      fileType,
      fileSize: file.size,
      createdBy: userId,
    })

    // 异步生成缩略图（不阻塞上传响应）
    this.thumbnailService.generate(file.buffer, file.originalname).then((url) => {
      if (url) this.service.updatePaperThumbnail(paper.id, url).catch(() => {});
    }).catch(() => {});

    return paper;
  }

  @Delete('papers/:id')
  async deletePaper(@Param('id') id: string) {
    return this.service.deletePaper(id)
  }
}
