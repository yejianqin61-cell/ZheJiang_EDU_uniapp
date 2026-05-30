import { Injectable } from '@nestjs/common';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class LocalFileService {
  private readonly exportDir: string;

  constructor() {
    this.exportDir = join(process.cwd(), 'exports');
    if (!existsSync(this.exportDir)) {
      mkdirSync(this.exportDir, { recursive: true });
    }
  }

  /**
   * Save file to local disk. Returns the file ID (relative path).
   * In production this would upload to COS and return the COS key.
   */
  save(filename: string, buffer: Buffer): string {
    const fileId = `${Date.now()}_${filename}`;
    const filePath = join(this.exportDir, fileId);
    writeFileSync(filePath, buffer);
    return fileId;
  }

  /**
   * Read a file from local disk.
   */
  read(fileId: string): Buffer | null {
    const filePath = join(this.exportDir, fileId);
    if (!existsSync(filePath)) return null;
    return readFileSync(filePath);
  }

  /**
   * Get download URL. In dev mode this is a local API endpoint.
   * In production this would be a COS signed URL.
   */
  getDownloadUrl(fileId: string): string {
    return `/v1/download/${fileId}`;
  }

  /**
   * Get file MIME type from extension.
   */
  getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'pdf': return 'application/pdf';
      default: return 'application/octet-stream';
    }
  }

  /**
   * TTL for download links — 24 hours.
   */
  getLinkTtl(): number {
    return 86400;
  }
}
