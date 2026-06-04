import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname as pathDirname } from 'path';

export interface UploadResult {
  url: string;    // COS URL or local file path
  key: string;    // COS key or local fileId
  isLocal: boolean;
}

@Injectable()
export class CosService {
  private readonly secretId: string;
  private readonly secretKey: string;
  private readonly bucket: string;
  private readonly region: string;
  private readonly isAvailable: boolean;

  // Local fallback directory
  private readonly localDir: string;

  constructor(private readonly config: ConfigService) {
    this.secretId = config.get<string>('cos.secretId', '');
    this.secretKey = config.get<string>('cos.secretKey', '');
    this.bucket = config.get<string>('cos.bucket', '');
    this.region = config.get<string>('cos.region', 'ap-guangzhou');
    this.isAvailable = !!(this.secretId && this.secretKey && this.bucket);

    this.localDir = join(process.cwd(), 'storage');
    if (!existsSync(this.localDir)) {
      mkdirSync(this.localDir, { recursive: true });
    }
  }

  /**
   * Upload a file. Uses COS in production, local storage in dev.
   */
  async upload(
    key: string,
    buffer: Buffer,
    contentType?: string,
  ): Promise<UploadResult> {
    if (this.isAvailable) {
      return this.uploadToCos(key, buffer, contentType);
    }
    return this.saveLocal(key, buffer);
  }

  /**
   * Get a download URL. COS returns a signed URL (24h), local returns API path.
   */
  getDownloadUrl(key: string): string {
    if (this.isAvailable) {
      return this.getCosSignedUrl(key);
    }
    return `/v1/download/${key}`;
  }

  /**
   * Read file content. COS fetches remotely, local reads from disk.
   */
  async read(key: string): Promise<Buffer | null> {
    if (this.isAvailable) {
      return this.downloadFromCos(key);
    }
    return this.readLocal(key);
  }

  /**
   * Get content type from file extension.
   */
  getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'pdf': return 'application/pdf';
      case 'png': return 'image/png';
      case 'jpg': case 'jpeg': return 'image/jpeg';
      default: return 'application/octet-stream';
    }
  }

  // ── COS implementation ──

  private async uploadToCos(
    key: string,
    buffer: Buffer,
    contentType?: string,
  ): Promise<UploadResult> {
    const COS = require('cos-nodejs-sdk-v5');
    const cos = new COS({
      SecretId: this.secretId,
      SecretKey: this.secretKey,
    });

    return new Promise((resolve, reject) => {
      cos.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        },
        (err: any, _data: any) => {
          if (err) return reject(err);
          resolve({
            url: `https://${this.bucket}.cos.${this.region}.myqcloud.com/${key}`,
            key,
            isLocal: false,
          });
        },
      );
    });
  }

  private getCosSignedUrl(key: string): string {
    const COS = require('cos-nodejs-sdk-v5');
    const cos = new COS({
      SecretId: this.secretId,
      SecretKey: this.secretKey,
    });

    return cos.getObjectUrl(
      {
        Bucket: this.bucket,
        Region: this.region,
        Key: key,
        Sign: true,
        Expires: 86400, // 24h
      },
      (_err: any, data: any) => data?.Url ?? '',
    );
  }

  private async downloadFromCos(key: string): Promise<Buffer | null> {
    const COS = require('cos-nodejs-sdk-v5');
    const cos = new COS({
      SecretId: this.secretId,
      SecretKey: this.secretKey,
    });

    return new Promise((resolve) => {
      cos.getObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
        },
        (err: any, data: any) => {
          if (err) return resolve(null);
          resolve(data.Body as Buffer);
        },
      );
    });
  }

  // ── Local fallback ──

  private async saveLocal(key: string, buffer: Buffer): Promise<UploadResult> {
    const filePath = join(this.localDir, key);
    const dir = pathDirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, buffer);
    return { url: filePath, key, isLocal: true };
  }

  private readLocal(key: string): Buffer | null {
    const filePath = join(this.localDir, key);
    if (!existsSync(filePath)) return null;
    return readFileSync(filePath);
  }
}
