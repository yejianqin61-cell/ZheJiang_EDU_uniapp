import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Question } from '../../../database/entities/question.entity';
import { QuestionKnowledge } from '../../../database/entities/question-knowledge.entity';
import { KnowledgePoint } from '../../../database/entities/knowledge-point.entity';
import { EmbeddingService } from '../../knowledge-base/services/embedding.service';

interface CandidateQuestion {
  question: Question;
  score: number; // relevance score (0-1)
}

@Injectable()
export class RetrievalService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(QuestionKnowledge)
    private readonly qkRepo: Repository<QuestionKnowledge>,
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Multi-stage retrieval:
   * 1. DB filter: subject + grade + status=approved + isDeleted=false
   * 2. Vector search (if knowledgePointIds provided): cosine similarity on KP embeddings
   * 3. Re-rank by difficulty distribution
   */
  async retrieve(params: {
    subject: string;
    grade: string;
    knowledgePointIds?: string[];
    difficulty: string;   // '1' | '2' | '3' | 'mixed'
    questionCount: number;
  }): Promise<Question[]> {
    const { subject, grade, knowledgePointIds, difficulty, questionCount } = params;

    // Stage 1: DB filter
    let candidates = await this.dbFilter(subject, grade);

    if (candidates.length === 0) {
      return [];
    }

    // Stage 2: Vector search (if KP specified)
    if (knowledgePointIds && knowledgePointIds.length > 0) {
      candidates = await this.vectorRelevance(candidates, knowledgePointIds);
    }

    // Stage 3: Re-rank by difficulty distribution
    const selected = this.difficultyReRank(candidates, difficulty, questionCount);

    return selected;
  }

  // === Stage 1: DB Filter ===
  private async dbFilter(subject: string, grade: string): Promise<CandidateQuestion[]> {
    const questions = await this.questionRepo.find({
      where: { subject, grade, status: 'approved', isDeleted: false },
      relations: ['sourceFile'],
    });

    return questions.map((q) => ({ question: q, score: 0.5 }));
  }

  // === Stage 2: Vector Relevance ===
  private async vectorRelevance(
    candidates: CandidateQuestion[],
    kpIds: string[],
  ): Promise<CandidateQuestion[]> {
    // Get selected KPs with embeddings
    const kps = await this.kpRepo.find({ where: { id: In(kpIds) } });

    // Get question-KP associations for all candidates
    const questionIds = candidates.map((c) => c.question.id);
    const associations = await this.qkRepo.find({
      where: { questionId: In(questionIds) },
    });

    // Build KP→Question map
    const kpQuestionMap = new Map<string, Set<string>>();
    for (const a of associations) {
      if (!kpQuestionMap.has(a.knowledgePointId)) {
        kpQuestionMap.set(a.knowledgePointId, new Set());
      }
      kpQuestionMap.get(a.knowledgePointId)!.add(a.questionId);
    }

    // Score each candidate: how many of the selected KPs does it match?
    for (const candidate of candidates) {
      let matches = 0;
      for (const kp of kps) {
        const qSet = kpQuestionMap.get(kp.id);
        if (qSet?.has(candidate.question.id)) {
          matches++;
          // Boost by embedding similarity if both have vectors
          if (candidate.question.embedding && kp.embedding) {
            const sim = this.embeddingService.cosineSimilarity(
              candidate.question.embedding as number[],
              kp.embedding as number[],
            );
            candidate.score += sim * 0.1;
          }
        }
      }
      candidate.score = matches / Math.max(kps.length, 1);
    }

    // Sort by score descending, keep top K (3x questionCount)
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  // === Stage 3: Difficulty Re-rank ===
  private difficultyReRank(
    candidates: CandidateQuestion[],
    difficulty: string,
    count: number,
  ): Question[] {
    // Group candidates by difficulty
    const buckets: Record<number, CandidateQuestion[]> = { 1: [], 2: [], 3: [] };
    for (const c of candidates) {
      const d = c.question.difficulty;
      if (buckets[d]) buckets[d].push(c);
    }

    // Sort each bucket by score
    for (const d of [1, 2, 3]) {
      buckets[d].sort((a, b) => b.score - a.score);
    }

    // Determine target distribution
    let dist: [number, number, number]; // [easy, medium, hard] ratios
    if (difficulty === 'mixed') {
      dist = [1, 2, 1]; // 1:2:1
    } else {
      const d = Number(difficulty);
      dist = [d === 1 ? 1 : 0, d === 2 ? 1 : 0, d === 3 ? 1 : 0];
    }

    const totalRatio = dist[0] + dist[1] + dist[2];
    const targets = dist.map((r) => Math.round((r / totalRatio) * count)) as [number, number, number];

    // Adjust to ensure sum === count
    const diff = count - targets.reduce((s, v) => s + v, 0);
    targets[1] += diff; // Adjust medium bucket

    // Sample from each bucket
    const selected: Question[] = [];
    for (let d = 0; d < 3; d++) {
      const bucket = buckets[d + 1];
      const n = Math.min(targets[d], bucket.length);
      // Fisher-Yates shuffle on top candidates, take first n
      const shuffled = [...bucket].sort(() => Math.random() - 0.5);
      selected.push(...shuffled.slice(0, n).map((c) => c.question));
    }

    // Fill remaining slots if some buckets were short
    if (selected.length < count) {
      const usedIds = new Set(selected.map((q) => q.id));
      for (const c of candidates) {
        if (selected.length >= count) break;
        if (!usedIds.has(c.question.id)) {
          selected.push(c.question);
          usedIds.add(c.question.id);
        }
      }
    }

    // Shuffle final order
    return selected.sort(() => Math.random() - 0.5).slice(0, count);
  }
}
