import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Paper } from '../../database/entities/paper.entity';
import { PaperQuestionSnapshot } from '../../database/entities/paper-question-snapshot.entity';
import { Question } from '../../database/entities/question.entity';
import { KnowledgePoint } from '../../database/entities/knowledge-point.entity';
import { QuestionKnowledge } from '../../database/entities/question-knowledge.entity';
import { RetrievalService } from './services/retrieval.service';
import { GenerationService } from './services/generation.service';

@Injectable()
export class PaperService {

  constructor(
    @InjectRepository(Paper)
    private readonly paperRepo: Repository<Paper>,
    @InjectRepository(PaperQuestionSnapshot)
    private readonly snapshotRepo: Repository<PaperQuestionSnapshot>,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
    @InjectRepository(QuestionKnowledge)
    private readonly qkRepo: Repository<QuestionKnowledge>,
    private readonly retrievalService: RetrievalService,
    private readonly generationService: GenerationService,
  ) {}

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

    // Stage 1: Retrieve candidate questions directly
    // Note: do NOT use retrievalService.retrieve() — has SQL.js compat issues with repo.find()
    let allCandidates = await this.questionRepo.createQueryBuilder('q')
      .where('q.subject = :s', { s: dto.subject })
      .andWhere('q.grade = :g', { g: dto.grade })
      .andWhere('q.status = :st', { st: 'approved' })
      .andWhere('q.isDeleted = :del', { del: false })
      .getMany();

    // Stage 1.5: Filter by knowledge points if specified
    if (dto.knowledgePointIds && dto.knowledgePointIds.length > 0) {
      // Use repo.find() instead of getRawMany() to avoid SQL.js column name issues
      const qkEntries = await this.qkRepo.find({
        where: { knowledgePointId: In(dto.knowledgePointIds) },
        select: ['questionId'],
      });
      const matchingIds = new Set(qkEntries.map((e) => e.questionId));
      allCandidates = allCandidates.filter((q) => matchingIds.has(q.id));
    }

    // Apply difficulty distribution
    const finalCandidates = this.applyDifficultyFilter(allCandidates, dto.difficulty, dto.questionCount);

    if (finalCandidates.length < dto.questionCount) {
      throw new BadRequestException({
        code: 20002,
        message: `题库题目不足：需要${dto.questionCount}题，实际匹配${finalCandidates.length}题。请调整条件。`,
      });
    }

    // Use finalCandidates going forward
    const generated = await this.generationService.generate(
      dto.subject, dto.grade, dto.difficulty, finalCandidates,
    );

    // Stage 3: Save paper
    const questionIds = finalCandidates.slice(0, dto.questionCount).map((q) => q.id);
    const generateMs = Date.now() - startedAt;

    const paper = await this.paperRepo.save(
      this.paperRepo.create({
        userId,
        title: generated.title,
        conditions: dto as any,
        questionIds,
        totalScore: dto.questionCount * 5,
        status: 'draft',
        generateMs,
      }),
    );

    // Stage 4: Save snapshots
    const snapshots = finalCandidates.slice(0, dto.questionCount).map((q, i) =>
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

  private applyDifficultyFilter(questions: Question[], difficulty: string, count: number): Question[] {
    if (questions.length === 0) return [];

    if (difficulty === 'mixed') {
      // Shuffle and return up to count
      return questions.sort(() => Math.random() - 0.5).slice(0, count);
    }

    const d = Number(difficulty);
    const filtered = questions.filter((q) => q.difficulty === d);
    if (filtered.length >= count) {
      return filtered.sort(() => Math.random() - 0.5).slice(0, count);
    }
    // Not enough of requested difficulty — fill with others
    const others = questions.filter((q) => q.difficulty !== d);
    return [...filtered, ...others].slice(0, count);
  }

  async debugCount(subject: string, grade: string) {
    const qb = this.questionRepo.createQueryBuilder('q')
      .where('q.subject = :subject', { subject })
      .andWhere('q.grade = :grade', { grade })
      .andWhere('q.status = :status', { status: 'approved' })
      .andWhere('q.isDeleted = :del', { del: false });
    return { count: await qb.getCount(), subject, grade };
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
