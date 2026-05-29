import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../../../database/entities/question.entity';

@Injectable()
export class TaggerService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
  ) {}

  async tagQuestion(
    questionText: string,
    subject: string,
    grade: string,
    sourceFileId: string,
  ) {
    // TODO:
    // 1. Call LLM: parse question type, answer, analysis (prompt §2.3)
    // 2. Call LLM: identify knowledge points within subject/grade scope (prompt §2.4)
    // 3. Call LLM: assess difficulty 1/2/3 (prompt §2.5)
    // 4. Generate embedding for content via Embedding API
    // 5. Save question with status = 'parsed'
    // 6. Call KnowledgeService to match/create knowledge points
    // 7. Return created question
    return this.questionRepo.create({
      type: 'single_choice',
      content: questionText,
      options: [],
      answer: '',
      analysis: null,
      difficulty: 1,
      subject,
      grade,
      sourceFileId,
      status: 'parsed',
    });
  }
}
