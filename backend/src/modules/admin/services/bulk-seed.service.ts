import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Question } from '../../../database/entities/question.entity';
import { KnowledgePoint } from '../../../database/entities/knowledge-point.entity';
import { QuestionKnowledge } from '../../../database/entities/question-knowledge.entity';
import { EmbeddingService } from '../../knowledge-base/services/embedding.service';

const STAGES: Record<string, string[]> = {
  '小学': ['一年级','二年级','三年级','四年级','五年级','六年级'],
  '初中': ['七年级','八年级','九年级'],
  '高中': ['高一','高二','高三'],
};

interface GeneratedQ {
  type: string;
  content: string;
  options: string[];
  answer: string;
  analysis: string;
  difficulty: number;
  knowledgePoints: string[];
}

@Injectable()
export class BulkSeedService {
  private readonly llmUrl: string;
  private readonly llmKey: string;
  private readonly llmModel: string;

  constructor(
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(KnowledgePoint)
    private readonly kpRepo: Repository<KnowledgePoint>,
    @InjectRepository(QuestionKnowledge)
    private readonly qkRepo: Repository<QuestionKnowledge>,
    private readonly embeddingService: EmbeddingService,
    config: ConfigService,
  ) {
    this.llmUrl = config.get<string>('llm.primary.apiUrl', '');
    this.llmKey = config.get<string>('llm.primary.apiKey', '');
    this.llmModel = config.get<string>('llm.primary.model', 'qwen-plus-latest');
  }

  async seedSubject(subject: string, perGrade: number = 5, specificGrade?: string) {
    const llmAvailable = !!(this.llmUrl && this.llmKey);
    if (!llmAvailable) {
      return { error: 'LLM not configured — cannot generate questions' };
    }

    const grades: string[] = specificGrade
      ? [specificGrade]
      : (() => { const all: string[] = []; for (const [, gs] of Object.entries(STAGES)) all.push(...gs); return all; })();

    const results: Record<string, number> = {};

    for (const grade of grades) {
      // Skip if already enough questions for this grade+subject
      const existingCount = await this.questionRepo.createQueryBuilder('q')
        .where('q.subject = :s', { s: subject })
        .andWhere('q.grade = :g', { g: grade })
        .andWhere('q.status = :st', { st: 'approved' })
        .getCount();

      if (existingCount >= perGrade) {
        results[grade] = 0;
        continue;
      }

      const needed = perGrade - existingCount;
      try {
        const count = await this.generateForGrade(subject, grade, needed);
        results[grade] = count;
        console.log(`[BulkSeed] ${subject}/${grade}: +${count} questions`);
      } catch (err: any) {
        console.error(`[BulkSeed] ${subject}/${grade} FAILED:`, err.message);
        results[grade] = -1;
      }
    }

    return { subject, results };
  }

  private async generateForGrade(subject: string, grade: string, count: number): Promise<number> {
    const prompt = buildPrompt(subject, grade, count);
    const raw = await this.callLLM(prompt);
    const questions = this.parseQuestions(raw);

    let inserted = 0;
    for (const q of questions) {
      try {
        // Map type
        const type = mapType(q.type);
        const difficulty = q.difficulty >= 1 && q.difficulty <= 3 ? q.difficulty : 2;

        // Embedding
        let embedding: number[] | null = null;
        try { embedding = await this.embeddingService.embed(q.content); } catch {}

        const saved = await this.questionRepo.save(
          this.questionRepo.create({
            type,
            content: q.content,
            options: q.options ?? [],
            answer: q.answer ?? '',
            analysis: q.analysis ?? '',
            difficulty,
            subject,
            grade,
            embedding: embedding as any,
            status: 'approved',
            isDeleted: false,
          }),
        );

        // Knowledge points
        for (const kpName of (q.knowledgePoints ?? [])) {
          let kp = await this.kpRepo.findOne({ where: { name: kpName, subject, grade } });
          if (!kp) {
            let kpEmb: number[] | null = null;
            try { kpEmb = await this.embeddingService.embed(kpName); } catch {}
            kp = await this.kpRepo.save(
              this.kpRepo.create({ name: kpName, subject, grade, embedding: kpEmb as any, questionCount: 1 }),
            );
          } else {
            await this.kpRepo.update(kp.id, { questionCount: () => 'question_count + 1' } as any);
          }

          await this.qkRepo.save(
            this.qkRepo.create({ questionId: saved.id, knowledgePointId: kp.id, confidence: 0.85 }),
          );
        }

        inserted++;
      } catch (err: any) {
        console.error(`[BulkSeed] Failed to save question:`, err.message);
      }
    }

    return inserted;
  }

  private async callLLM(prompt: string): Promise<string> {
    const res = await axios.post(
      this.llmUrl,
      { model: this.llmModel, messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 4096 },
      { headers: { Authorization: `Bearer ${this.llmKey}`, 'Content-Type': 'application/json' }, timeout: 60000 },
    );
    return res.data.choices?.[0]?.message?.content ?? '';
  }

  private parseQuestions(raw: string): GeneratedQ[] {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      // Try array match
      const arrMatch = raw.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        try { return JSON.parse(arrMatch[0]); } catch {}
      }
      return [];
    }
    try {
      const parsed = JSON.parse(match[0]);
      return parsed.questions ?? [];
    } catch {
      return [];
    }
  }
}

function buildPrompt(subject: string, grade: string, count: number): string {
  // Determine a difficulty ratio appropriate for the grade
  const difficultyNote = count >= 5
    ? '难度按照 2:2:1 分配（简单:中等:困难）'
    : '难度适当分布在简单和中等之间';

  return `你是一位K12教育考试命题专家。请为${grade}${subject}生成${count}道考试题目。

## 要求
- 题型多样化：包含选择题(single_choice)、判断题(true_false)、填空题(fill_blank)、解答题(short_answer)
- ${difficultyNote}
- 难度 1=简单, 2=中等, 3=困难
- 每道题标注1-2个知识点
- 符合${grade}教学大纲

## 输出JSON格式
{
  "questions": [
    {
      "type": "single_choice",
      "content": "题目正文",
      "options": ["A. x", "B. x", "C. x", "D. x"],
      "answer": "正确答案",
      "analysis": "解析",
      "difficulty": 2,
      "knowledgePoints": ["知识点1", "知识点2"]
    }
  ]
}

请只输出JSON，不要额外说明。`;
}

function mapType(raw: string): string {
  const t = (raw ?? '').toLowerCase();
  if (t.includes('choice') || t.includes('选择')) return 'single_choice';
  if (t.includes('判断') || t.includes('tf') || t.includes('true')) return 'true_false';
  if (t.includes('填空') || t.includes('blank') || t.includes('fill')) return 'fill_blank';
  if (t.includes('解答') || t.includes('简答') || t.includes('short') || t.includes('answer')) return 'short_answer';
  return 'single_choice';
}
