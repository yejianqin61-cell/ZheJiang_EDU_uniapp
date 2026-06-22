import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../../../database/entities/question.entity';
import { KnowledgePoint } from '../../../database/entities/knowledge-point.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
  ) {}

  async getStats() {
    const baseWhere = { isDeleted: false, status: 'approved' };

    const totalQuestions = await this.questionRepo.count({ where: baseWhere });

    const bySubject = await this.questionRepo
      .createQueryBuilder('q')
      .select('q.subject', 'subject')
      .addSelect('COUNT(*)', 'count')
      .where('q.isDeleted = :del', { del: false })
      .andWhere('q.status = :status', { status: 'approved' })
      .groupBy('q.subject')
      .getRawMany();

    const byGrade = await this.questionRepo
      .createQueryBuilder('q')
      .select('q.grade', 'grade')
      .addSelect('COUNT(*)', 'count')
      .where('q.isDeleted = :del', { del: false })
      .andWhere('q.status = :status', { status: 'approved' })
      .groupBy('q.grade')
      .getRawMany();

    const byDifficulty = await this.questionRepo
      .createQueryBuilder('q')
      .select('q.difficulty', 'level')
      .addSelect('COUNT(*)', 'count')
      .where('q.isDeleted = :del', { del: false })
      .andWhere('q.status = :status', { status: 'approved' })
      .groupBy('q.difficulty')
      .getRawMany();

    const totalKnowledgePoints = await this.kpRepo.count();

    // Exercise paper stats (raw queries since repos aren't injected in this module)
    let exercisePaperCount = 0;
    let pendingExerciseReview = 0;
    let todayOrders = 0;
    let pendingPrint = 0;
    let pendingReview = 0;

    try {
      const exResult = await this.questionRepo.manager.query(`SELECT COUNT(*) as cnt FROM exercise_paper`);
      exercisePaperCount = Number(exResult[0]?.cnt ?? 0);

      const exPending = await this.questionRepo.manager.query(
        `SELECT COUNT(*) as cnt FROM teacher_exercise_upload WHERE status = 'pending_review'`
      );
      pendingExerciseReview = Number(exPending[0]?.cnt ?? 0);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const orderResult = await this.questionRepo.manager.query(
        `SELECT COUNT(*) as cnt FROM "order" WHERE created_at >= ?`, [todayStart.toISOString()]
      );
      todayOrders = Number(orderResult[0]?.cnt ?? 0);

      const printResult = await this.questionRepo.manager.query(
        `SELECT COUNT(*) as cnt FROM "order" WHERE type = 'print' AND print_status IS NULL`
      );
      pendingPrint = Number(printResult[0]?.cnt ?? 0);

      const reviewResult = await this.questionRepo.manager.query(
        `SELECT COUNT(*) as cnt FROM question WHERE status = 'pending_review' AND is_deleted = 0`
      );
      pendingReview = Number(reviewResult[0]?.cnt ?? 0);
    } catch { /* ignore — table might not exist yet */ }

    const diffLabels: Record<number, string> = { 1: '简单', 2: '中等', 3: '困难' };

    return {
      totalQuestions,
      bySubject: bySubject.map((item) => ({
        subject: item.subject,
        count: Number(item.count),
      })),
      byGrade: byGrade.map((item) => ({
        grade: item.grade,
        count: Number(item.count),
      })),
      byDifficulty: byDifficulty.map((d) => ({
        level: Number(d.level),
        label: diffLabels[Number(d.level)] ?? '未知',
        count: Number(d.count),
      })),
      totalKnowledgePoints,
      exercisePaperCount,
      pendingExerciseReview,
      pendingReview,
      todayOrders,
      pendingPrint,
    };
  }
}
