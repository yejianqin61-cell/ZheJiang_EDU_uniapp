import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TeacherExerciseUpload } from '../../../database/entities/teacher-exercise-upload.entity';
import { ExercisePaper } from '../../../database/entities/exercise-paper.entity';
import { ExerciseCategory } from '../../../database/entities/exercise-category.entity';
import { ExerciseLesson } from '../../../database/entities/exercise-lesson.entity';
import { PricingService } from '../../print/services/pricing.service';
import { BalanceService } from '../../balance/services/balance.service';
import { ThumbnailService } from '../../exercise/services/thumbnail.service';

export interface UploadExercisePaperDto {
  title: string;
  subject: string;
  grade: string;
  exerciseType: string;
  categoryId?: string;
  lessonId?: string;
}

export interface ListUploadsParams {
  userId?: string;
  page: number;
  pageSize: number;
  status?: string;
  subject?: string;
  grade?: string;
  exerciseType?: string;
}

@Injectable()
export class ExerciseContributionService {
  constructor(
    @InjectRepository(TeacherExerciseUpload)
    private readonly uploadRepo: Repository<TeacherExerciseUpload>,
    @InjectRepository(ExercisePaper)
    private readonly paperRepo: Repository<ExercisePaper>,
    @InjectRepository(ExerciseCategory)
    private readonly categoryRepo: Repository<ExerciseCategory>,
    @InjectRepository(ExerciseLesson)
    private readonly lessonRepo: Repository<ExerciseLesson>,
    private readonly pricingService: PricingService,
    private readonly balanceService: BalanceService,
    private readonly thumbnailService: ThumbnailService,
  ) {}

  // ── Upload ───────────────────────────────────────────────

  async upload(
    userId: string,
    file: { filename: string; buffer: Buffer; size: number },
    dto: UploadExercisePaperDto,
  ) {
    const { v4: uuid } = require('uuid');
    const { extname, join } = require('path');
    const { writeFileSync, existsSync, mkdirSync } = require('fs');

    const uploadDir = join(process.cwd(), 'uploads', 'exercises');
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

    const ext = extname(file.filename);
    const filename = `${uuid()}${ext}`;
    writeFileSync(join(uploadDir, filename), file.buffer);

    const fileUrl = `/uploads/exercises/${filename}`;
    const fileType = ext.replace('.', '');

    // 先存 DB，立即返回不阻塞
    const upload = await this.uploadRepo.save(
      this.uploadRepo.create({
        userId,
        title: dto.title,
        subject: dto.subject,
        grade: dto.grade,
        exerciseType: dto.exerciseType,
        categoryId: dto.categoryId || null,
        lessonId: dto.lessonId || null,
        fileUrl,
        fileType,
        fileSize: file.size,
        status: 'pending_review',
      }),
    );

    // 异步生成缩略图（不阻塞上传响应）
    this.thumbnailService.generate(file.buffer, file.filename).then((url) => {
      if (url) this.uploadRepo.update(upload.id, { thumbnailUrl: url });
    }).catch(() => {});

    return { id: upload.id, status: upload.status };
  }

  // ── Teacher: list my uploads ─────────────────────────────

  async listMyUploads(userId: string, page: number, pageSize: number, status?: string) {
    const where: any = { userId };
    if (status) where.status = status;

    const [list, total] = await this.uploadRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      list,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ── Teacher: get detail ──────────────────────────────────

  async getDetail(id: string, userId: string) {
    const upload = await this.uploadRepo.findOne({ where: { id, userId } });
    if (!upload) throw new NotFoundException({ code: 60001, message: '上传记录不存在' });
    return upload;
  }

  // ── Teacher: delete ──────────────────────────────────────

  async delete(id: string, userId: string) {
    const upload = await this.uploadRepo.findOne({ where: { id, userId } });
    if (!upload) throw new NotFoundException({ code: 60001, message: '上传记录不存在' });
    if (upload.status === 'approved') {
      throw new ConflictException({ code: 60002, message: '已通过的记录不可删除' });
    }
    await this.uploadRepo.delete(id);
    return { deleted: true };
  }

  // ── Teacher: list categories for upload form ─────────────

  async listCategories(grade?: string, subject?: string, exerciseType?: string) {
    const where: any = {};
    if (grade) where.grade = grade;
    if (subject) where.subject = subject;
    if (exerciseType) where.type = exerciseType;

    return this.categoryRepo.find({ where, order: { sortOrder: 'ASC' } });
  }

  async listLessons(categoryId: string) {
    return this.lessonRepo.find({
      where: { unitId: categoryId },
      order: { sortOrder: 'ASC' },
    });
  }

  // ── Admin: list all uploads ──────────────────────────────

  async listAll(params: ListUploadsParams) {
    const { userId, page, pageSize, status, subject, grade, exerciseType } = params;
    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (subject) where.subject = subject;
    if (grade) where.grade = grade;
    if (exerciseType) where.exerciseType = exerciseType;

    const [list, total] = await this.uploadRepo.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      list: list.map((u) => ({
        id: u.id,
        title: u.title,
        subject: u.subject,
        grade: u.grade,
        exerciseType: u.exerciseType,
        categoryId: u.categoryId,
        lessonId: u.lessonId,
        fileUrl: u.fileUrl,
        fileType: u.fileType,
        fileSize: u.fileSize,
        thumbnailUrl: u.thumbnailUrl,
        status: u.status,
        reviewNote: u.reviewNote,
        cashbackAmount: u.cashbackAmount,
        uploaderPhone: (u as any).user?.phone || null,
        createdAt: u.createdAt,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ── Admin: approve ───────────────────────────────────────

  async approve(id: string, reviewerId: string) {
    const upload = await this.uploadRepo.findOne({ where: { id } });
    if (!upload) throw new NotFoundException({ code: 60001, message: '上传记录不存在' });
    if (upload.status !== 'pending_review') {
      throw new ConflictException({ code: 60003, message: '仅可审核待审核状态的记录' });
    }

    const cashbackPrice = await this.pricingService.getExerciseCashbackPrice();

    // Update upload record
    upload.status = 'approved';
    upload.cashbackAmount = cashbackPrice;
    upload.reviewedBy = reviewerId;
    upload.reviewedAt = new Date();
    await this.uploadRepo.save(upload);

    // Create exercise_paper entry
    const paper = await this.paperRepo.save(
      this.paperRepo.create({
        title: upload.title,
        fileUrl: upload.fileUrl,
        fileType: upload.fileType,
        fileSize: upload.fileSize,
        thumbnailUrl: upload.thumbnailUrl,
        categoryId: upload.categoryId,
        lessonId: upload.lessonId,
        createdBy: upload.userId,
      }),
    );

    // Cashback
    try {
      await this.balanceService.addBalance({
        userId: upload.userId,
        amount: cashbackPrice,
        type: 'exercise_cashback',
        refId: upload.id,
        note: `练习试卷审核通过：${upload.title}`,
      });
    } catch { /* cashback fail should not block approval */ }

    return { paperId: paper.id, cashbackAmount: cashbackPrice };
  }

  // ── Admin: reject ────────────────────────────────────────

  async reject(id: string, reviewerId: string, note?: string) {
    const upload = await this.uploadRepo.findOne({ where: { id } });
    if (!upload) throw new NotFoundException({ code: 60001, message: '上传记录不存在' });
    if (upload.status !== 'pending_review') {
      throw new ConflictException({ code: 60003, message: '仅可审核待审核状态的记录' });
    }

    upload.status = 'rejected';
    upload.reviewNote = note || null;
    upload.reviewedBy = reviewerId;
    upload.reviewedAt = new Date();
    await this.uploadRepo.save(upload);

    return { status: 'rejected' };
  }

  // ── Admin: batch ─────────────────────────────────────────

  async batchApprove(ids: string[], reviewerId: string) {
    const results: { id: string; success: boolean; error?: string }[] = [];
    for (const id of ids) {
      try {
        await this.approve(id, reviewerId);
        results.push({ id, success: true });
      } catch (e: any) {
        results.push({ id, success: false, error: e?.message });
      }
    }
    return results;
  }

  async batchReject(ids: string[], reviewerId: string, note?: string) {
    const results: { id: string; success: boolean; error?: string }[] = [];
    for (const id of ids) {
      try {
        await this.reject(id, reviewerId, note);
        results.push({ id, success: true });
      } catch (e: any) {
        results.push({ id, success: false, error: e?.message });
      }
    }
    return results;
  }
}
