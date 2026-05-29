import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { KnowledgePoint } from '../../../database/entities/knowledge-point.entity';
import { QuestionKnowledge } from '../../../database/entities/question-knowledge.entity';

@Injectable()
export class KnowledgeService {
  private readonly mergeThreshold: number;

  constructor(
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
    @InjectRepository(QuestionKnowledge)
    private readonly qkRepo: Repository<QuestionKnowledge>,
    config: ConfigService,
  ) {
    this.mergeThreshold = config.get<number>('knowledge.mergeSimilarityThreshold', 0.92);
  }

  async findOrCreate(
    kpName: string,
    subject: string,
    grade: string,
    embedding: number[],
  ): Promise<string> {
    // TODO:
    // 1. Generate embedding for kpName via Embedding API
    // 2. pgvector cosine similarity search within same subject+grade
    //    SELECT id, 1 - (embedding <=> $embedding) AS sim FROM knowledge_point
    //    WHERE subject = $subject AND grade = $grade
    //    ORDER BY embedding <=> $embedding LIMIT 1
    // 3. IF sim >= mergeThreshold → MERGE: increment question_count, return existing kpId
    // 4. ELSE → CREATE new knowledge_point, return new kpId
    const kp = await this.kpRepo.save(
      this.kpRepo.create({ name: kpName, subject, grade, questionCount: 1 }),
    );
    return kp.id;
  }

  async associateQuestion(questionId: string, kpId: string, confidence: number) {
    await this.qkRepo.save(
      this.qkRepo.create({ questionId, knowledgePointId: kpId, confidence }),
    );
  }

  async listKnowledgePoints(
    pagination: { page: number; pageSize: number },
    subject?: string,
    grade?: string,
    keyword?: string,
  ) {
    const qb = this.kpRepo.createQueryBuilder('kp');

    if (subject) qb.andWhere('kp.subject = :subject', { subject });
    if (grade) qb.andWhere('kp.grade = :grade', { grade });
    if (keyword) qb.andWhere('kp.name ILIKE :keyword', { keyword: `%${keyword}%` });

    qb.orderBy('kp.question_count', 'DESC')
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
}
