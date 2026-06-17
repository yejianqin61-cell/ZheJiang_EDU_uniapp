import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Question } from '../../../database/entities/question.entity';
import { KbFile } from '../../../database/entities/kb-file.entity';
import { User } from '../../../database/entities/user.entity';
import { PricingConfig } from '../../../database/entities/pricing-config.entity';
import { BalanceService } from '../../balance/services/balance.service';
import { PaginatedResult } from '../../../common/dto/pagination.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(KbFile)
    private readonly fileRepo: Repository<KbFile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PricingConfig)
    private readonly pricingRepo: Repository<PricingConfig>,
    private readonly balanceService: BalanceService,
  ) {}

  async getPendingList(
    pagination: { page: number; pageSize: number },
    fileId?: string,
  ): Promise<PaginatedResult<any>> {
    const qb = this.questionRepo
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.sourceFile', 'f')
      .leftJoinAndSelect('f.uploader', 'u')
      .leftJoinAndSelect('q.questionKnowledge', 'qk')
      .leftJoinAndSelect('qk.knowledgePoint', 'kp')
      .where('(q.status = :parsed OR q.status = :pending)', { parsed: 'parsed', pending: 'pending_review' })
      .andWhere('q.isDeleted = :isDeleted', { isDeleted: false });

    if (fileId) qb.andWhere('q.sourceFileId = :fileId', { fileId });

    qb.orderBy('q.createdAt', 'ASC')
      .skip((pagination.page - 1) * pagination.pageSize)
      .take(pagination.pageSize);

    const [list, total] = await qb.getManyAndCount();

    return {
      list: list.map((q) => {
        const file = (q as any).sourceFile;
        const uploader = file?.uploader;
        return {
          id: q.id,
          type: q.type,
          content: q.content,
          options: q.options,
          answer: q.answer,
          analysis: q.analysis,
          difficulty: q.difficulty,
          subject: q.subject,
          grade: q.grade,
          status: q.status,
          source: {
            type: uploader?.role === 'teacher' ? 'teacher' : 'admin',
            userName: uploader?.nickname ?? '',
            userId: uploader?.id ?? '',
            fileName: file?.filename ?? '',
            fileId: file?.id ?? '',
          },
          knowledgePoints: (q as any).questionKnowledge?.map((qk: any) => qk.knowledgePoint?.name).filter(Boolean) ?? [],
        };
      }),
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize),
      },
    };
  }

  async getDetail(questionId: string) {
    const q = await this.questionRepo.findOne({
      where: { id: questionId, isDeleted: false },
      relations: ['sourceFile', 'sourceFile.uploader', 'questionKnowledge', 'questionKnowledge.knowledgePoint'],
    });
    if (!q) throw new NotFoundException({ code: 60003, message: '题目不存在' });

    const file = (q as any).sourceFile;
    const uploader = file?.uploader;
    return {
      id: q.id,
      type: q.type,
      content: q.content,
      options: q.options,
      answer: q.answer,
      analysis: q.analysis,
      difficulty: q.difficulty,
      subject: q.subject,
      grade: q.grade,
      status: q.status,
      source: {
        type: uploader?.role === 'teacher' ? 'teacher' : 'admin',
        userName: uploader?.nickname ?? '',
        userId: uploader?.id ?? '',
        fileName: file?.filename ?? '',
        fileId: file?.id ?? '',
      },
      knowledgePoints: (q as any).questionKnowledge?.map((qk: any) => qk.knowledgePoint?.name).filter(Boolean) ?? [],
    };
  }

  async batchReview(
    reviewerId: string,
    questionIds: string[],
    action: 'approve' | 'reject',
  ) {
    const questions = await this.questionRepo.find({
      where: { id: In(questionIds), isDeleted: false },
      relations: ['sourceFile', 'sourceFile.uploader'],
    });

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const now = new Date();

    let updated = 0;
    const failedIds: string[] = [];

    // Get cashback price
    const cashbackConfig = await this.pricingRepo.findOne({ where: { type: 'cashback', tier: 1 } });
    const cashbackPrice = cashbackConfig?.unitPrice ?? 100;

    // Track which kb_files had all questions reviewed
    const fileIds = new Set<string>();

    for (const q of questions) {
      try {
        if (q.status !== 'parsed' && q.status !== 'pending_review') {
          failedIds.push(q.id);
          continue;
        }

        await this.questionRepo.update(q.id, {
          status: newStatus,
          reviewedById: reviewerId,
          reviewedAt: now,
        });
        updated++;

        if (action === 'approve') {
          // Cashback: only for teacher-uploaded questions
          const file = (q as any).sourceFile;
          const uploader = file?.uploader;
          if (uploader && uploader.role === 'teacher') {
            await this.balanceService.addBalance({
              userId: uploader.id,
              amount: cashbackPrice,
              type: 'cashback',
              refId: q.id,
              note: `题目审核通过: ${q.subject}-${q.content.slice(0, 20)}`,
            }).catch(() => {}); // don't block review on cashback failure
          }

          if (q.sourceFileId) fileIds.add(q.sourceFileId);
        }
      } catch {
        failedIds.push(q.id);
      }
    }

    // Check if any file's all questions are now reviewed
    for (const fileId of fileIds) {
      const pendingCount = await this.questionRepo.count({
        where: { sourceFileId: fileId, isDeleted: false, status: In(['parsed', 'pending_review']) },
      });
      if (pendingCount === 0) {
        await this.fileRepo.update(fileId, { submitStatus: 'reviewed' });
      }
    }

    const notFound = questionIds.filter((id) => !questions.find((q) => q.id === id));

    return {
      [action === 'approve' ? 'approved' : 'rejected']: updated,
      failed: questionIds.length - updated,
      failedIds: [...failedIds, ...notFound],
      cashbackPerQuestion: cashbackPrice,
    };
  }
}
