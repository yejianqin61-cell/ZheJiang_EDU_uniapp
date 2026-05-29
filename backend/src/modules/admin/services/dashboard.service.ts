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
      .where('q.is_deleted = FALSE')
      .andWhere('q.status = :status', { status: 'approved' })
      .groupBy('q.subject')
      .getRawMany();

    const byGrade = await this.questionRepo
      .createQueryBuilder('q')
      .select('q.grade', 'grade')
      .addSelect('COUNT(*)', 'count')
      .where('q.is_deleted = FALSE')
      .andWhere('q.status = :status', { status: 'approved' })
      .groupBy('q.grade')
      .getRawMany();

    const byDifficulty = await this.questionRepo
      .createQueryBuilder('q')
      .select('q.difficulty', 'level')
      .addSelect('COUNT(*)', 'count')
      .where('q.is_deleted = FALSE')
      .andWhere('q.status = :status', { status: 'approved' })
      .groupBy('q.difficulty')
      .getRawMany();

    const totalKnowledgePoints = await this.kpRepo.count();

    const diffLabels: Record<number, string> = { 1: '简单', 2: '中等', 3: '困难' };

    return {
      totalQuestions,
      bySubject,
      byGrade,
      byDifficulty: byDifficulty.map((d) => ({
        level: Number(d.level),
        label: diffLabels[Number(d.level)] ?? '未知',
        count: Number(d.count),
      })),
      totalKnowledgePoints,
    };
  }
}
