import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Question } from '../../../database/entities/question.entity';

@Injectable()
export class TaggerService {
  private readonly primaryUrl: string;
  private readonly primaryKey: string;
  private readonly primaryModel: string;

  constructor(
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    private readonly config: ConfigService,
  ) {
    this.primaryUrl = config.get<string>('llm.primary.apiUrl', '');
    this.primaryKey = config.get<string>('llm.primary.apiKey', '');
    this.primaryModel = config.get<string>('llm.primary.model', 'qwen-plus-latest');
  }

  async tagQuestion(
    questionText: string,
    subject: string,
    grade: string,
    sourceFileId: string,
  ): Promise<Question> {
    let parsed: ParsedQuestion;

    if (this.primaryUrl && this.primaryKey) {
      parsed = await this.llmParse(questionText);
    } else {
      parsed = this.heuristicParse(questionText);
    }

    const question = await this.questionRepo.save(
      this.questionRepo.create({
        type: parsed.type,
        content: questionText,
        options: parsed.options,
        answer: '',     // production: no answers in question bank
        analysis: '',   // production: no analysis in question bank
        difficulty: parsed.difficulty,
        subject,
        grade,
        sourceFileId,
        status: 'parsed',
      }),
    );

    return question;
  }

  async identifyKnowledgePoints(
    questionContent: string,
    subject: string,
    grade: string,
  ): Promise<string[]> {
    if (this.primaryUrl && this.primaryKey) {
      return this.llmKnowledgePoints(questionContent, subject, grade);
    }
    return this.heuristicKnowledgePoints(questionContent, subject);
  }

  // === LLM paths ===

  private async llmParse(text: string): Promise<ParsedQuestion> {
    const res = await this.callLLM(PARSE_PROMPT, text);
    const json = this.extractJSON(res);
    return {
      type: json.type ?? 'single_choice',
      options: json.options ?? [],
      answer: json.answer ?? '',
      analysis: json.analysis ?? '',
      difficulty: json.difficulty ?? 2,
    };
  }

  private async llmKnowledgePoints(
    content: string, subject: string, grade: string,
  ): Promise<string[]> {
    const prompt = KP_PROMPT.replace('{subject}', subject).replace('{grade}', grade);
    const res = await this.callLLM(prompt, content);
    return this.extractJSON(res) ?? [];
  }

  private async callLLM(systemPrompt: string, userContent: string): Promise<string> {
    const res = await axios.post(
      this.primaryUrl,
      {
        model: this.primaryModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 2048,
      },
      {
        headers: { Authorization: `Bearer ${this.primaryKey}`, 'Content-Type': 'application/json' },
        timeout: 60000,
      },
    );
    return res.data.choices?.[0]?.message?.content ?? '';
  }

  private extractJSON(raw: string): any {
    const match = raw.match(/[\{\[][\s\S]*[\}\]]/);
    if (!match) return {};
    try { return JSON.parse(match[0]); } catch { return {}; }
  }

  // === Heuristic fallbacks (dev) ===

  private heuristicParse(text: string): ParsedQuestion {
    const hasABCD = /[A-D][\.\、\s]/.test(text);
    const hasTF = /[对错√×]/.test(text) || /正确|错误/.test(text);
    const hasBlank = /[\(（]\s*[\)）]/.test(text) || /___|____/.test(text) || /填空/.test(text);

    let type = 'short_answer';
    if (hasABCD) type = 'single_choice';
    else if (hasTF) type = 'true_false';
    else if (hasBlank) type = 'fill_blank';

    return {
      type,
      options: hasABCD ? this.extractOptions(text) : [],
      answer: '',
      analysis: '',
      difficulty: this.heuristicDifficulty(text),
    };
  }

  private extractOptions(text: string): string[] {
    const re = /([A-D])[\.\、\s]\s*(.+?)(?=\s*[A-D][\.\、\s]|$)/g;
    const opts: string[] = [];
    let m;
    while ((m = re.exec(text)) !== null) {
      opts.push(m[2].trim());
    }
    return opts;
  }

  private heuristicDifficulty(text: string): number {
    const len = text.length;
    if (len < 80) return 1;
    if (len < 200) return 2;
    return 3;
  }

  private heuristicKnowledgePoints(content: string, subject: string): string[] {
    // Extract potential knowledge point keywords from content
    const keywords: Record<string, string[]> = {
      '数学': ['计算', '方程', '几何', '函数', '概率', '统计', '代数', '三角', '数列', '导数'],
      '语文': ['阅读', '作文', '古诗', '文言文', '修辞', '语法', '标点', '拼音', '字词'],
      '英语': ['词汇', '语法', '阅读', '写作', '听力', '翻译', '时态', '从句'],
    };

    const pool = keywords[subject] ?? ['基础知识'];
    const found = pool.filter((kw) => content.includes(kw));
    return found.length > 0 ? found.slice(0, 2) : [pool[0]];
  }
}

interface ParsedQuestion {
  type: string;
  options: string[];
  answer: string;
  analysis: string;
  difficulty: number;
}

const PARSE_PROMPT = `你是一位教育考试题目解析专家。请分析以下题目，提取结构化信息。

## 输出JSON格式
{
  "type": "single_choice|multi_choice|true_false|fill_blank|short_answer",
  "options": ["A. ...", "B. ..."],
  "answer": "正确答案",
  "analysis": "解题思路或解析",
  "difficulty": 1
}
difficulty: 1=简单 2=中等 3=困难`;

const KP_PROMPT = `你是一位K12教育领域的学科专家。题目所属学科是"{subject}"，年级是"{grade}"。
请识别以下题目涉及的知识点。

## 输出JSON字符串数组
["知识点1", "知识点2"]

## 规则
1. 知识点粒度适中，每个题目1-3个知识点
2. 使用教学中通用的知识点命名
3. 严格限定在{subject}学科{grade}年级的知识范围内`;
