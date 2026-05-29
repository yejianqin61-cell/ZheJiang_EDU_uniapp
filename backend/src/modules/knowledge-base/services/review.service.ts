import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Question } from '../../../database/entities/question.entity';
import { PaginatedResult } from '../../../common/dto/pagination.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
  ) {}

  async getPendingList(
    pagination: { page: number; pageSize: number },
    fileId?: string,
  ): Promise<PaginatedResult<Question>> {
    const qb = this.questionRepo
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.sourceFile', 'f')
      .leftJoinAndSelect('q.reviewedBy', 'r')
      .where('q.status = :status', { status: 'parsed' })
      .andWhere('q.is_deleted = :isDeleted', { isDeleted: false });

    if (fileId) qb.andWhere('q.source_file_id = :fileId', { fileId });

    qb.orderBy('q.created_at', 'ASC')
      .skip((pagination.page - 1) * pagination.pageSize)
      .take(pagination.pageSize);

    const [list, total] = await qb.getManyAndCount();

    return {
      list,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize),
      },
    };
  }

  async batchReview(
    reviewerId: string,
    questionIds: string[],
    action: 'approve' | 'reject',
  ) {
    const questions = await this.questionRepo.find({
      where: { id: In(questionIds), status: 'parsed', isDeleted: false },
    });

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const now = new Date();

    let updated = 0;
    const failedIds: string[] = [];

    for (const q of questions) {
      try {
        await this.questionRepo.update(q.id, {
          status: newStatus,
          reviewedById: reviewerId,
          reviewedAt: now,
        });
        updated++;
      } catch {
        failedIds.push(q.id);
      }
    }

    const notFound = questionIds.filter(
      (id) => !questions.find((q) => q.id === id),
    );

    return {
      [action === 'approve' ? 'approved' : 'rejected']: updated,
      failed: questionIds.length - updated,
      failedIds: [...failedIds, ...notFound],
    };
  }
}
