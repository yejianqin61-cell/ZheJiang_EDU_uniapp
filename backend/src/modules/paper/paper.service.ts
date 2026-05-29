import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Paper } from '../../database/entities/paper.entity';
import { PaperQuestionSnapshot } from '../../database/entities/paper-question-snapshot.entity';
import { Question } from '../../database/entities/question.entity';
import { KnowledgePoint } from '../../database/entities/knowledge-point.entity';

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
    // TODO: full RAG pipeline
    // 1. Vector search: pgvector cosine similarity on selected KP embeddings
    // 2. Re-rank: difficulty distribution
    // 3. LLM generate: build prompt → call Qwen3/DeepSeek-V4
    // 4. Validate response JSON
    // 5. Save paper + snapshots
    const paper = await this.paperRepo.save(
      this.paperRepo.create({
        userId,
        title: `${dto.grade}${dto.subject}练习卷`,
        conditions: dto,
        questionIds: [],
        status: 'draft',
        generateMs: 0,
      }),
    );
    return {
      paperId: paper.id,
      title: paper.title,
      questions: [],
      generateTime: 0,
    };
  }

  async regenerate(paperId: string, userId: string) {
    // TODO: check daily limit (3), reuse conditions, call generate
    return { paperId, title: '', questions: [], generateTime: 0 };
  }
}
