import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Question } from '../../../database/entities/question.entity';

interface GeneratedQuestion {
  index: number;
  type: string;
  content: string;
  options: string[];
}

@Injectable()
export class GenerationService {
  private readonly primaryUrl: string;
  private readonly primaryKey: string;
  private readonly fallbackUrl: string;
  private readonly fallbackKey: string;
  private readonly timeout: number;

  constructor(private readonly config: ConfigService) {
    this.primaryUrl = config.get<string>('llm.primary.apiUrl', '');
    this.primaryKey = config.get<string>('llm.primary.apiKey', '');
    this.fallbackUrl = config.get<string>('llm.fallback.apiUrl', '');
    this.fallbackKey = config.get<string>('llm.fallback.apiKey', '');
    this.timeout = config.get<number>('llm.timeout', 20000);
  }

  /**
   * Generate a paper from candidate questions.
   * LLM mode: build prompt → call LLM → validate JSON → return
   * Dev mode: format DB questions directly as the paper
   */
  async generate(
    subject: string,
    grade: string,
    difficulty: string,
    candidates: Question[],
  ): Promise<{ title: string; questions: GeneratedQuestion[] }> {
    if (this.primaryUrl && this.primaryKey) {
      return this.llmGenerate(subject, grade, difficulty, candidates);
    }
    return this.devGenerate(subject, grade, candidates);
  }

  // === LLM Generation ===
  private async llmGenerate(
    subject: string,
    grade: string,
    difficulty: string,
    candidates: Question[],
  ): Promise<{ title: string; questions: GeneratedQuestion[] }> {
    const prompt = this.buildPrompt(subject, grade, difficulty, candidates);

    let result: string;
    try {
      result = await this.callLLM(this.primaryUrl, this.primaryKey, prompt);
    } catch {
      // Fallback
      if (this.fallbackUrl && this.fallbackKey) {
        result = await this.callLLM(this.fallbackUrl, this.fallbackKey, prompt);
      } else {
        throw new Error('LLM generation failed and no fallback configured');
      }
    }

    const parsed = this.validateAndParse(result, candidates.length);
    return {
      title: parsed.title ?? `${grade}${subject}练习卷`,
      questions: parsed.questions,
    };
  }

  private buildPrompt(
    subject: string,
    grade: string,
    difficulty: string,
    candidates: Question[],
  ): string {
    const candidatesJson = candidates.map((q) => ({
      id: q.id,
      type: q.type,
      content: q.content,
      options: q.options,
      answer: q.answer,
      analysis: q.analysis,
      difficulty: q.difficulty,
    }));

    const diffLabel = difficulty === 'mixed' ? '简单:中等:困难 ≈ 1:2:1' : `全部为${difficulty}难度`;

    return `你是一位资深的教育考试命题专家。请根据以下条件生成一份试卷。

## 试卷要求
- 学科: ${subject}
- 年级: ${grade}
- 难度分布: ${diffLabel}
- 题目数量: ${candidates.length}题

## 参考题库（必须从以下题目中选择，不可编造新题）
${JSON.stringify(candidatesJson, null, 2)}

## 输出要求
以严格的JSON格式输出:
{
  "title": "试卷标题",
  "questions": [
    {
      "index": 1,
      "type": "single_choice",
      "content": "题目正文",
      "options": ["A. ...", "B. ..."]
    }
  ]
}

## 规则
1. 只能从参考题库中选择题目，使用题目中的 id 来标识
2. 题型多样化：避免同类型题目集中排列
3. 难度符合分布要求
4. 给试卷起一个合适的标题`;
  }

  private async callLLM(url: string, key: string, prompt: string): Promise<string> {
    const res = await axios.post(
      url,
      {
        model: 'qwen3',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 4096,
      },
      {
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        timeout: this.timeout,
      },
    );
    return res.data.choices?.[0]?.message?.content ?? '';
  }

  private validateAndParse(raw: string, expectedCount: number): {
    title?: string;
    questions: GeneratedQuestion[];
  } {
    // Extract JSON from possible markdown code block
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('LLM response is not valid JSON');

    try {
      const parsed = JSON.parse(match[0]);
      const questions = (parsed.questions ?? []).map((q: any, i: number) => ({
        index: i + 1,
        type: q.type ?? 'single_choice',
        content: q.content ?? '',
        options: q.options ?? [],
      }));

      return { title: parsed.title, questions };
    } catch {
      throw new Error('Failed to parse LLM response');
    }
  }

  // === Dev Fallback: return DB questions as-is ===
  private devGenerate(
    subject: string,
    grade: string,
    candidates: Question[],
  ): { title: string; questions: GeneratedQuestion[] } {
    const questions: GeneratedQuestion[] = candidates.map((q, i) => ({
      index: i + 1,
      type: q.type,
      content: q.content,
      options: q.options ?? [],
    }));

    return {
      title: `${grade}${subject}综合练习卷`,
      questions,
    };
  }

  /**
   * Strip metadata for teacher-facing output.
   * Only index, type, content, options are returned to teachers.
   */
  stripMetadata(questions: GeneratedQuestion[]): GeneratedQuestion[] {
    return questions.map((q) => ({
      index: q.index,
      type: q.type,
      content: q.content,
      options: q.options,
    }));
  }
}
