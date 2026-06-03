import { Injectable } from '@nestjs/common';
import { CosService } from '../../../common/cos.service';

/**
 * File storage abstraction. Delegates to CosService (COS or local fallback).
 */
@Injectable()
export class LocalFileService {
  constructor(private readonly cosService: CosService) {}

  async save(filename: string, buffer: Buffer): Promise<string> {
    const key = `exports/${Date.now()}_${filename}`;
    const result = await this.cosService.upload(key, buffer);
    return result.key;
  }

  async read(key: string): Promise<Buffer | null> {
    return this.cosService.read(key);
  }

  getDownloadUrl(key: string): string {
    return this.cosService.getDownloadUrl(key);
  }

  getMimeType(filename: string): string {
    return this.cosService.getContentType(filename);
  }

  getLinkTtl(): number {
    return 86400;
  }
}
