import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KbFile } from '../../../database/entities/kb-file.entity';
import { OCRService } from './ocr.service';
import { SplitterService } from './splitter.service';
import { TaggerService } from './tagger.service';
import { KnowledgeService } from './knowledge.service';

@Injectable()
export class PipelineService {
  constructor(
    @InjectRepository(KbFile)
    private readonly fileRepo: Repository<KbFile>,
    private readonly ocrService: OCRService,
    private readonly splitterService: SplitterService,
    private readonly taggerService: TaggerService,
    private readonly knowledgeService: KnowledgeService,
  ) {}

  /**
   * Run the full ingestion pipeline for a file.
   * Called synchronously in dev mode (no BullMQ), or by the queue worker in prod.
   */
  async process(fileId: string, rawText?: string): Promise<void> {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) return;

    try {
      // Step 1: Get text content
      let text = rawText ?? '';

      const isImage = ['png', 'jpg', 'jpeg'].includes(file.fileType);
      if (isImage || (!text && file.fileType === 'pdf')) {
        text = await this.ocrService.processFile(fileId, file.cosUrl, isImage);
      }

      if (!text || text.trim().length === 0) {
        throw new Error('No text content extracted from file');
      }

      // Step 2: Split into individual questions
      const questions = await this.splitterService.split(text);
      if (questions.length === 0) {
        throw new Error('No questions detected in text');
      }

      // Step 3: Tag each question + identify knowledge points
      let questionCount = 0;
      for (const qText of questions) {
        try {
          // 3a: Parse question structure (type, answer, analysis, difficulty)
          const question = await this.taggerService.tagQuestion(
            qText, file.subject, file.grade, fileId,
          );

          // 3b: Identify knowledge points
          const kpNames = await this.taggerService.identifyKnowledgePoints(
            qText, file.subject, file.grade,
          );

          // 3c: Find or create knowledge points + associate
          for (const kpName of kpNames) {
            const kpId = await this.knowledgeService.findOrCreate(
              kpName, file.subject, file.grade,
            );
            await this.knowledgeService.associateQuestion(question.id, kpId, 0.8);
          }

          questionCount++;
        } catch (err: any) {
          console.error(`Failed to process question in file ${fileId}:`, err.message);
          // Continue processing other questions
        }
      }

      // Step 4: Mark file as completed
      await this.fileRepo.update(fileId, {
        status: 'completed',
        questionCount,
      });
    } catch (err: any) {
      await this.fileRepo.update(fileId, {
        status: 'failed',
        errorMsg: err.message,
      });
      throw err;
    }
  }
}
