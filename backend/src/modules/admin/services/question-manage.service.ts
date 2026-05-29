import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, ILike } from 'typeorm';
import { Question } from '../../../database/entities/question.entity';
import { PaginatedResult } from '../../../common/dto/pagination.dto';

@Injectable()
export class QuestionManageService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
  ) {}

  async list(params: {
    page: number;
    pageSize: number;
    subject?: string;
    grade?: string;
    difficulty?: number;
    knowledgePointId?: string;
    fileId?: string;
    keyword?: string;
  }): Promise<PaginatedResult<Question>> {
    const qb = this.questionRepo
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.sourceFile', 'f')
      .leftJoin('q.questionKnowledge', 'qk')
      .where('q.is_deleted = FALSE')
      .andWhere('q.status = :status', { status: 'approved' });

    if (params.subject) qb.andWhere('q.subject = :subject', { subject: params.subject });
    if (params.grade) qb.andWhere('q.grade = :grade', { grade: params.grade });
    if (params.difficulty) qb.andWhere('q.difficulty = :difficulty', { difficulty: params.difficulty });
    if (params.fileId) qb.andWhere('q.source_file_id = :fileId', { fileId: params.fileId });
    if (params.knowledgePointId) qb.andWhere('qk.knowledge_point_id = :kpId', { kpId: params.knowledgePointId });
    if (params.keyword) qb.andWhere('q.content ILIKE :kw', { kw: `%${params.keyword}%` });

    qb.orderBy('q.created_at', 'DESC')
      .skip((params.page - 1) * params.pageSize)
      .take(params.pageSize);

    const [list, total] = await qb.getManyAndCount();

    return {
      list,
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages: Math.ceil(total / params.pageSize),
      },
    };
  }

  async detail(questionId: string) {
    const q = await this.questionRepo.findOne({
      where: { id: questionId, isDeleted: false },
      relations: ['sourceFile', 'reviewedBy'],
    });
    if (!q) throw new NotFoundException({ code: 70001, message: '题目不存在' });
    return q;
  }

  async softDelete(questionId: string) {
    const result = await this.questionRepo.update(
      { id: questionId, isDeleted: false },
      { isDeleted: true },
    );
    if (result.affected === 0) {
      throw new NotFoundException({ code: 70001, message: '题目不存在' });
    }
    return { deleted: true };
  }

  async batchDelete(questionIds: string[]) {
    const result = await this.questionRepo.update(
      { id: In(questionIds), isDeleted: false },
      { isDeleted: true },
    );
    return { deleted: result.affected ?? 0 };
  }

  async deleteByFile(fileId: string) {
    const result = await this.questionRepo.update(
      { sourceFileId: fileId, isDeleted: false },
      { isDeleted: true },
    );
    return { deleted: result.affected ?? 0 };
  }
}
