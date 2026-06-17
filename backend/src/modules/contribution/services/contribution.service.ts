import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { KbFile } from '../../../database/entities/kb-file.entity';
import { Question } from '../../../database/entities/question.entity';
import { KnowledgePoint } from '../../../database/entities/knowledge-point.entity';
import { QuestionKnowledge } from '../../../database/entities/question-knowledge.entity';

export interface BatchSummary {
  fileId: string;
  filename: string;
  subject: string;
  grade: string;
  totalQuestions: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  submitStatus: string;
  cashbackEarned: number;
  createdAt: Date;
}

@Injectable()
export class ContributionService {
  constructor(
    @InjectRepository(KbFile)
    private readonly fileRepo: Repository<KbFile>,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
    @InjectRepository(QuestionKnowledge)
    private readonly qkRepo: Repository<QuestionKnowledge>,
  ) {}

  // ── List teacher's contribution batches ─────────────────────

  async listBatches(userId: string, page: number, pageSize: number) {
    const qb = this.fileRepo
      .createQueryBuilder('f')
      .where('f.uploaderId = :userId', { userId })
      .andWhere('f.questionCount > 0')
      .orderBy('f.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [files, total] = await qb.getManyAndCount();

    const list: BatchSummary[] = [];
    for (const file of files) {
      const stats = await this.getFileQuestionStats(file.id);
      list.push({
        fileId: file.id,
        filename: file.filename,
        subject: file.subject,
        grade: file.grade,
        totalQuestions: file.questionCount,
        approvedCount: stats.approved,
        rejectedCount: stats.rejected,
        pendingCount: stats.pending + stats.parsed, // parsed = draft, pending_review = submitted
        submitStatus: file.submitStatus,
        cashbackEarned: stats.cashbackEarned,
        createdAt: file.createdAt,
      });
    }

    return {
      list,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ── Batch detail (all questions) ─────────────────────────────

  async getBatchDetail(fileId: string, userId: string) {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) throw new NotFoundException({ code: 60001, message: '批次不存在' });
    if (file.uploaderId !== userId) {
      throw new ForbiddenException({ code: 60002, message: '无权访问该批次' });
    }

    const questions = await this.questionRepo.find({
      where: { sourceFileId: fileId, isDeleted: false },
      order: { createdAt: 'ASC' },
    });

    // Load knowledge points for each question
    const qIds = questions.map((q) => q.id);
    const qkRows = qIds.length > 0
      ? await this.qkRepo.find({ where: { questionId: In(qIds) } })
      : [];
    const kpIds = [...new Set(qkRows.map((r) => r.knowledgePointId))];
    const kps = kpIds.length > 0
      ? await this.kpRepo.find({ where: { id: In(kpIds) } })
      : [];
    const kpMap = new Map(kps.map((k) => [k.id, k.name]));
    const questionKpMap = new Map<string, string[]>();
    for (const row of qkRows) {
      if (!questionKpMap.has(row.questionId)) questionKpMap.set(row.questionId, []);
      questionKpMap.get(row.questionId)!.push(kpMap.get(row.knowledgePointId) ?? '');
    }

    const stats = await this.getFileQuestionStats(fileId);

    return {
      fileId: file.id,
      filename: file.filename,
      submitStatus: file.submitStatus,
      questions: questions.map((q) => ({
        id: q.id,
        type: q.type,
        content: q.content,
        options: q.options,
        answer: q.answer,
        analysis: q.analysis,
        difficulty: q.difficulty,
        status: q.status,
        knowledgePoints: questionKpMap.get(q.id) ?? [],
        cashbackAmount: q.status === 'approved' ? (stats.cashbackPerQuestion ?? 100) : 0,
      })),
      stats: {
        total: stats.total,
        approved: stats.approved,
        rejected: stats.rejected,
        pending: stats.pending + stats.parsed,
      },
    };
  }

  // ── Submit for review ───────────────────────────────────────

  async submitForReview(fileId: string, userId: string) {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) throw new NotFoundException({ code: 60001, message: '批次不存在' });
    if (file.uploaderId !== userId) {
      throw new ForbiddenException({ code: 60002, message: '无权操作该批次' });
    }
    if (file.submitStatus !== 'draft') {
      throw new ConflictException({ code: 60004, message: '该批次已提交或已审核' });
    }

    // Move all parsed questions to pending_review
    const result = await this.questionRepo.update(
      { sourceFileId: fileId, status: 'parsed', isDeleted: false },
      { status: 'pending_review' },
    );

    // Update file submit status
    await this.fileRepo.update(fileId, { submitStatus: 'pending_review' });

    return { submitted: result.affected ?? 0 };
  }

  // ── Helper: question stats per file ─────────────────────────

  private async getFileQuestionStats(fileId: string) {
    const questions = await this.questionRepo.find({
      where: { sourceFileId: fileId, isDeleted: false },
    });

    const approved = questions.filter((q) => q.status === 'approved').length;
    const rejected = questions.filter((q) => q.status === 'rejected').length;
    const pending = questions.filter((q) => q.status === 'pending_review').length;
    const parsed = questions.filter((q) => q.status === 'parsed').length;

    return {
      total: questions.length,
      approved,
      rejected,
      pending,
      parsed,
      cashbackEarned: approved * 100, // default 100 per question; actual value from pricing_config
      cashbackPerQuestion: 100,
    };
  }
}
