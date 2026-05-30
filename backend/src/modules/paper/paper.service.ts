import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Paper } from '../../database/entities/paper.entity';
import { PaperQuestionSnapshot } from '../../database/entities/paper-question-snapshot.entity';
import { Question } from '../../database/entities/question.entity';
import { KnowledgePoint } from '../../database/entities/knowledge-point.entity';
import { RetrievalService } from './services/retrieval.service';
import { GenerationService } from './services/generation.service';

@Injectable()
export class PaperService {
  private readonly regenerateDailyLimit: number;

  constructor(
    @InjectRepository(Paper)
    private readonly paperRepo: Repository<Paper>,
    @InjectRepository(PaperQuestionSnapshot)
    private readonly snapshotRepo: Repository<PaperQuestionSnapshot>,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
    private readonly retrievalService: RetrievalService,
    private readonly generationService: GenerationService,
    config: ConfigService,
  ) {
    this.regenerateDailyLimit = config.get<number>('paper.regenerateDailyLimit', 3);
  }

  getConfigOptions() {
    return {
      grades: [
        { stage: '小学', grades: ['一年级','二年级','三年级','四年级','五年级','六年级'] },
        { stage: '初中', grades: ['七年级','八年级','九年级'] },
        { stage: '高中', grades: ['高一','高二','高三'] },
      ],
      subjects: ['语文','数学','英语','物理','化学','生物','政治','历史','地理'],
      difficulties: [
        { value: 1, label: '简单' },
        { value: 2, label: '中等' },
        { value: 3, label: '困难' },
        { value: 'mixed', label: '混合' },
      ],
    };
  }

  async getKnowledgePoints(subject: string, grade: string) {
    return this.kpRepo.find({
      where: { subject, grade },
      select: ['id', 'name', 'questionCount'],
      order: { questionCount: 'DESC' },
    });
  }

  async generate(userId: string, dto: {
    subject: string;
    grade: string;
    knowledgePointIds?: string[];
    difficulty: string;
    questionCount: number;
  }) {
    const startedAt = Date.now();

    // Stage 1: Retrieve candidate questions
    const candidates = await this.retrievalService.retrieve({
      subject: dto.subject,
      grade: dto.grade,
      knowledgePointIds: dto.knowledgePointIds,
      difficulty: dto.difficulty,
      questionCount: dto.questionCount,
    });

    if (candidates.length < dto.questionCount) {
      throw new BadRequestException({
        code: 20002,
        message: `题库题目不足：需要${dto.questionCount}题，实际匹配${candidates.length}题。请调整条件。`,
      });
    }

    // Stage 2: Generate paper (LLM or dev fallback)
    const generated = await this.generationService.generate(
      dto.subject, dto.grade, dto.difficulty, candidates,
    );

    // Stage 3: Save paper
    const questionIds = candidates.slice(0, dto.questionCount).map((q) => q.id);
    const generateMs = Date.now() - startedAt;

    const paper = await this.paperRepo.save(
      this.paperRepo.create({
        userId,
        title: generated.title,
        conditions: dto as any,
        questionIds,
        totalScore: dto.questionCount * 5, // default 5 points each
        status: 'draft',
        generateMs,
      }),
    );

    // Stage 4: Save snapshots
    const snapshots = candidates.slice(0, dto.questionCount).map((q, i) =>
      this.snapshotRepo.create({
        paperId: paper.id,
        sortOrder: i + 1,
        questionId: q.id,
        snapshot: {
          type: q.type,
          content: q.content,
          options: q.options,
          answer: q.answer,
          analysis: q.analysis,
          difficulty: q.difficulty,
          score: 5,
        },
      }),
    );
    await this.snapshotRepo.save(snapshots);

    // Stage 5: Return teacher-facing data (no answers/analysis/score/difficulty/knowledgePoints)
    return {
      paperId: paper.id,
      title: paper.title,
      questions: this.generationService.stripMetadata(generated.questions),
      generateTime: +(generateMs / 1000).toFixed(1),
    };
  }

  async regenerate(paperId: string, userId: string) {
    const original = await this.paperRepo.findOne({
      where: { id: paperId, userId },
    });
    if (!original) {
      throw new NotFoundException({ code: 30001, message: '试卷不存在' });
    }

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCount = await this.paperRepo.count({
      where: { userId, createdAt: Between(today, tomorrow) },
    });

    if (todayCount >= this.regenerateDailyLimit) {
      throw new BadRequestException({
        code: 20004,
        message: `超过每日重新生成次数限制（${this.regenerateDailyLimit}次）`,
      });
    }

    // Mark old paper as expired (not draft anymore)
    await this.paperRepo.update(paperId, { status: 'draft' });

    // Re-generate with same conditions
    return this.generate(userId, original.conditions as any);
  }

  async getPaperById(paperId: string, userId: string) {
    const paper = await this.paperRepo.findOne({
      where: { id: paperId, userId },
    });
    if (!paper) throw new NotFoundException({ code: 30001, message: '试卷不存在' });

    // Load snapshots
    const snapshots = await this.snapshotRepo.find({
      where: { paperId },
      order: { sortOrder: 'ASC' },
    });

    const isPaid = paper.status === 'paid' || paper.status === 'exported';
    const questions = snapshots.map((s) => {
      const base = {
        index: s.sortOrder,
        type: s.snapshot.type,
        content: s.snapshot.content,
        options: s.snapshot.options,
      };
      // Only include answer/analysis for paid papers
      if (isPaid) {
        return {
          ...base,
          answer: s.snapshot.answer,
          analysis: s.snapshot.analysis,
          difficulty: s.snapshot.difficulty,
          score: s.snapshot.score,
        };
      }
      return base;
    });

    return {
      paperId: paper.id,
      title: paper.title,
      status: paper.status,
      questions,
      totalScore: isPaid ? paper.totalScore : undefined,
    };
  }
}
