import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OcrTask } from '../../../database/entities/ocr-task.entity';

@Injectable()
export class OCRService {
  constructor(
    @InjectRepository(OcrTask)
    private readonly ocrTaskRepo: Repository<OcrTask>,
  ) {}

  async processFile(fileId: string): Promise<string> {
    // TODO:
    // 1. Check if file needs OCR (image types or scanned PDF)
    // 2. Call PaddleOCR service
    // 3. Save result_text to ocr_task
    // 4. Return extracted text
    const task = await this.ocrTaskRepo.save(
      this.ocrTaskRepo.create({ fileId, status: 'completed', resultText: '' }),
    );
    return task.resultText ?? '';
  }
}
