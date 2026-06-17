import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SplitterService {
  private readonly primaryUrl: string;
  private readonly primaryKey: string;
  private readonly primaryModel: string;

  constructor(private readonly config: ConfigService) {
    this.primaryUrl = config.get<string>('llm.primary.apiUrl', '');
    this.primaryKey = config.get<string>('llm.primary.apiKey', '');
    this.primaryModel = config.get<string>('llm.primary.model', 'qwen-plus-latest');
  }

  async split(rawText: string): Promise<string[]> {
    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Empty text, cannot split');
    }

    if (this.primaryUrl && this.primaryKey) {
      return this.llmSplit(rawText);
    }
    return this.regexSplit(rawText);
  }

  // === LLM path (production) ===
  private async llmSplit(rawText: string): Promise<string[]> {
    const res = await axios.post(
      this.primaryUrl,
      {
        model: this.primaryModel,
        messages: [
          { role: 'system', content: SPLIT_PROMPT },
          { role: 'user', content: rawText },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      },
      {
        headers: { Authorization: `Bearer ${this.primaryKey}`, 'Content-Type': 'application/json' },
        timeout: 60000,
      },
    );

    const json = res.data.choices?.[0]?.message?.content ?? '[]';
    // Extract JSON array from possible markdown code block
    const match = json.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  }

  // === Regex fallback (dev) ===
  // Detects numbered questions like "1.xxxx", "1、xxxx", "（1）xxxx", etc.
  private regexSplit(rawText: string): string[] {
    const lines = rawText.split('\n');
    const questions: string[] = [];
    let current = '';

    // Match patterns like: "1.", "1、", "(1)", "（1）", "1．", "1）"
    const qStart = /^[\(\（]?\d+[\)\）\.\、\．]\s*/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (qStart.test(trimmed)) {
        if (current.trim()) questions.push(current.trim());
        current = trimmed;
      } else {
        current += (current ? '\n' : '') + trimmed;
      }
    }

    if (current.trim()) questions.push(current.trim());
    return questions;
  }
}

const SPLIT_PROMPT = `你是一位教育考试题目解析专家。请分析以下文本，识别并切分出每一道独立的题目。

## 规则
1. 准确识别题目边界，不要合并多题，也不要拆散单题
2. 忽略非题目的教学说明、页眉页脚等无关内容
3. 保留每道题目的完整原文（包括选项），不要截断

## 输出要求
以JSON字符串数组格式输出，每个元素是一道完整题目的文本：
["题目1全文", "题目2全文", ...]`;
