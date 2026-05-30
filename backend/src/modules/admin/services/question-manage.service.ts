import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Question } from '../../../database/entities/question.entity';
import { QuestionKnowledge } from '../../../database/entities/question-knowledge.entity';
import { KnowledgePoint } from '../../../database/entities/knowledge-point.entity';
import { PaginatedResult } from '../../../common/dto/pagination.dto';

@Injectable()
export class QuestionManageService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(QuestionKnowledge)
    private readonly qkRepo: Repository<QuestionKnowledge>,
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
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
    if (params.difficulty !== undefined) qb.andWhere('q.difficulty = :difficulty', { difficulty: params.difficulty });
    if (params.fileId) qb.andWhere('q.source_file_id = :fileId', { fileId: params.fileId });
    if (params.knowledgePointId) qb.andWhere('qk.knowledge_point_id = :kpId', { kpId: params.knowledgePointId });
    if (params.keyword) qb.andWhere('q.content LIKE :kw', { kw: `%${params.keyword}%` });

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

    // Load knowledge points separately
    const qkEntries = await this.qkRepo.find({
      where: { questionId },
      relations: ['knowledgePoint'],
    });
    const knowledgePoints = qkEntries.map((e) => ({
      id: e.knowledgePoint?.id,
      name: e.knowledgePoint?.name,
      confidence: e.confidence,
    }));

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
      sourceFile: q.sourceFile ? { id: q.sourceFile.id, filename: q.sourceFile.filename } : null,
      knowledgePoints,
      reviewedBy: q.reviewedBy ? { id: q.reviewedBy.id, nickname: q.reviewedBy.nickname } : null,
      reviewedAt: q.reviewedAt,
      createdAt: q.createdAt,
    };
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
