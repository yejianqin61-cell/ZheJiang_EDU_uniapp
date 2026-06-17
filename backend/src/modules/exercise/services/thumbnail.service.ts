import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);

  /**
   * 为上传文件生成缩略图。
   * 调用 export-service，成功返回 thumbnailUrl，失败返回 null（不阻塞上传）。
   */
  async generate(fileBuffer: Buffer, originalName: string): Promise<string | null> {
    const { writeFileSync, unlinkSync, existsSync, mkdirSync, createReadStream } = require('fs');
    const { join, extname } = require('path');
    const { v4: uuid } = require('uuid');

    const tmpDir = join(process.cwd(), 'uploads', 'tmp');
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

    const tmpName = `${uuid()}${extname(originalName)}`;
    const tmpPath = join(tmpDir, tmpName);

    try {
      writeFileSync(tmpPath, fileBuffer);

      const FormData = require('form-data');
      const axios = require('axios');
      const form = new FormData();
      form.append('file', createReadStream(tmpPath));

      const exportUrl = process.env.EXPORT_SERVICE_URL || 'http://localhost:5000';
      const res = await axios.post(`${exportUrl}/generate-thumbnail`, form, {
        headers: form.getHeaders(),
        timeout: 30000,
        responseType: 'json',
      });

      if (res.data?.thumbnailUrl) {
        this.logger.log(`Thumbnail generated: ${res.data.thumbnailUrl}`);
        return res.data.thumbnailUrl as string;
      }

      this.logger.warn('Export service returned no thumbnailUrl');
      return null;
    } catch (err: any) {
      this.logger.warn(`Thumbnail generation failed (non-blocking): ${err?.message}`);
      return null;
    } finally {
      try { unlinkSync(tmpPath); } catch {}
    }
  }
}
