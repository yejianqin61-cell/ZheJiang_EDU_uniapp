import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import axios from 'axios';
import { OcrTask } from '../../../database/entities/ocr-task.entity';

@Injectable()
export class OCRService {
  private readonly apiUrl: string;

  constructor(
    @InjectRepository(OcrTask)
    private readonly ocrTaskRepo: Repository<OcrTask>,
    private readonly config: ConfigService,
  ) {
    this.apiUrl = config.get<string>('ocr.apiUrl', '');
  }

  async processFile(fileId: string, fileUrl: string, isImage: boolean): Promise<string> {
    const task = await this.ocrTaskRepo.save(
      this.ocrTaskRepo.create({ fileId, status: 'processing' }),
    );

    try {
      let text: string;

      if (isImage && this.apiUrl) {
        text = await this.remoteOCR(fileUrl);
      } else if (isImage) {
        // Dev fallback: no OCR engine available
        text = `[OCR not available in dev mode for image: ${fileUrl}]`;
      } else {
        // Text-based file: OCR not needed, text extracted during upload
        text = '';
      }

      await this.ocrTaskRepo.update(task.id, {
        status: 'completed',
        resultText: text,
        durationMs: 0,
      });

      return text;
    } catch (err: any) {
      await this.ocrTaskRepo.update(task.id, {
        status: 'failed',
        errorMsg: err.message,
      });
      throw err;
    }
  }

  private async remoteOCR(fileUrl: string): Promise<string> {
    const res = await axios.post(
      this.apiUrl,
      { file_url: fileUrl },
      { timeout: 60000 },
    );
    return res.data?.text ?? '';
  }
}
