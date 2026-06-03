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

  /**
   * Process a file through OCR.
   * @param imageBase64 — base64-encoded image data (without data: prefix)
   */
  async processFile(
    fileId: string,
    imageBase64?: string,
  ): Promise<string> {
    const task = await this.ocrTaskRepo.save(
      this.ocrTaskRepo.create({ fileId, status: 'processing' }),
    );

    const startedAt = Date.now();

    try {
      let text: string;

      if (imageBase64) {
        // Preferred: use tesseract.js for local OCR
        text = await this.localOCR(imageBase64);
      } else if (this.apiUrl) {
        // Fallback: remote PaddleOCR service
        text = await this.remoteOCR(fileId);
      } else {
        text = '[OCR unavailable — no image data or OCR service configured]';
      }

      await this.ocrTaskRepo.update(task.id, {
        status: 'completed',
        resultText: text,
        durationMs: Date.now() - startedAt,
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

  private async localOCR(base64: string): Promise<string> {
    // Dynamic import to avoid tesseract.js penalty when unused
    const Tesseract = require('tesseract.js');
    console.log('[OCR] Starting tesseract.js (chi_sim)...');
    const { data } = await Tesseract.recognize(
      Buffer.from(base64, 'base64'),
      'chi_sim',
    );
    console.log(`[OCR] Recognized ${data.text.length} chars`);
    return data.text?.trim() ?? '';
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
