import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { KnowledgePoint } from '../../../database/entities/knowledge-point.entity';
import { QuestionKnowledge } from '../../../database/entities/question-knowledge.entity';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class KnowledgeService {
  private readonly mergeThreshold: number;

  constructor(
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
    @InjectRepository(QuestionKnowledge)
    private readonly qkRepo: Repository<QuestionKnowledge>,
    private readonly embeddingService: EmbeddingService,
    config: ConfigService,
  ) {
    this.mergeThreshold = config.get<number>('knowledge.mergeSimilarityThreshold', 0.92);
  }

  /**
   * Find an existing knowledge point by similarity, or create a new one.
   * Returns the knowledge point ID.
   */
  async findOrCreate(
    kpName: string,
    subject: string,
    grade: string,
  ): Promise<string> {
    const embedding = await this.embeddingService.embed(kpName);

    // Search existing KPs in same subject+grade
    const candidates = await this.kpRepo.find({
      where: { subject, grade },
      select: ['id', 'name', 'embedding', 'questionCount'],
    });

    let bestMatch: { id: string; similarity: number } | null = null;
    for (const c of candidates) {
      if (c.embedding && Array.isArray(c.embedding)) {
        const sim = this.embeddingService.cosineSimilarity(embedding, c.embedding as number[]);
        if (sim > (bestMatch?.similarity ?? 0)) {
          bestMatch = { id: c.id, similarity: sim };
        }
      }
    }

    if (bestMatch && bestMatch.similarity >= this.mergeThreshold) {
      // Merge: increment question count of existing KP
      await this.kpRepo.increment({ id: bestMatch.id }, 'questionCount', 1);
      return bestMatch.id;
    }

    // Create new KP
    const kp = await this.kpRepo.save(
      this.kpRepo.create({ name: kpName, subject, grade, embedding, questionCount: 1 }),
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
    if (keyword) qb.andWhere('kp.name LIKE :keyword', { keyword: `%${keyword}%` });

    qb.orderBy('kp.questionCount', 'DESC')
      .skip((pagination.page - 1) * pagination.pageSize)
      .take(pagination.pageSize);

    const [list, total] = await qb.getManyAndCount();

    return {
      list: list.map((kp) => ({
        id: kp.id,
        name: kp.name,
        subject: kp.subject,
        grade: kp.grade,
        questionCount: kp.questionCount,
        createdAt: kp.createdAt,
      })),
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize),
      },
    };
  }
}
