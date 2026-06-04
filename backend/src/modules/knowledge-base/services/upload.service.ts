import { Injectable, Optional, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as mammoth from 'mammoth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');
import { KbFile } from '../../../database/entities/kb-file.entity';
import { CosService } from '../../../common/cos.service';

const ALLOWED_EXTS = ['doc', 'docx', 'md', 'pdf', 'png', 'jpg', 'jpeg'];
const MAX_SIZE_TEXT = 50 * 1024 * 1024;
const MAX_SIZE_IMAGE = 10 * 1024 * 1024;
const IMAGE_EXTS = ['png', 'jpg', 'jpeg'];
const TEXT_EXTS = ['md', 'docx', 'pdf'];

@Injectable()
export class UploadService {
  constructor(
    @InjectRepository(KbFile)
    private readonly fileRepo: Repository<KbFile>,
    private readonly cosService: CosService,
    @Optional()
    @InjectQueue('kb-processing')
    private readonly kbQueue?: Queue,
  ) {}

  async upload(
    uploaderId: string,
    file: Express.Multer.File,
    subject: string,
    grade: string,
    pipeline?: (fileId: string, rawText?: string, imageBase64?: string) => Promise<void>,
  ) {
    // Multer 对中文文件名使用 latin1 解码，需手动转回 UTF-8
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = originalname.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTS.includes(ext)) {
      throw new BadRequestException({ code: 60001, message: `不支持的文件格式: .${ext}` });
    }

    const isImage = IMAGE_EXTS.includes(ext);
    const maxSize = isImage ? MAX_SIZE_IMAGE : MAX_SIZE_TEXT;
    if (file.size > maxSize) {
      throw new BadRequestException({ code: 60002, message: '文件大小超出限制' });
    }

    // Extract text & upload file to COS (or local fallback)
    let rawText: string | undefined;
    let imageBase64: string | undefined;

    if (isImage) {
      imageBase64 = file.buffer.toString('base64');
    } else {
      rawText = await this.extractText(file, ext);
    }

    // Upload file to COS (or local fallback)
    const cosKey = `uploads/${Date.now()}_${originalname}`;
    const uploadResult = await this.cosService.upload(
      cosKey,
      file.buffer,
      file.mimetype,
    );
    const cosUrl = uploadResult.url;

    const kbFile = await this.fileRepo.save(
      this.fileRepo.create({
        uploaderId,
        filename: originalname,
        fileType: ext,
        fileSize: file.size,
        subject,
        grade,
        cosUrl,
        status: 'processing',
      }),
    );

    // Run pipeline: prefer queue, fallback to direct call
    if (this.kbQueue) {
      await this.kbQueue.add('process-file', {
        fileId: kbFile.id,
        rawText,
        imageBase64,
        needOCR: isImage,
      });
    } else if (pipeline) {
      // Synchronous dev path — fire and forget (don't await)
      pipeline(kbFile.id, rawText, imageBase64).catch((err) => {
        console.error(`[Pipeline] FAILED for file ${kbFile.id}:`, err?.message ?? err, err?.stack?.split('\n')[1] ?? '');
      });
    }

    return {
      fileId: kbFile.id,
      filename: kbFile.filename,
      status: kbFile.status,
    };
  }

  async listFiles(page: number, pageSize: number, status?: string) {
    const qb = this.fileRepo.createQueryBuilder('f');
    if (status) qb.andWhere('f.status = :status', { status });
    qb.orderBy('f.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async getFileStatus(fileId: string) {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) return null;

    return {
      fileId: file.id,
      filename: file.filename,
      fileType: file.fileType,
      subject: file.subject,
      grade: file.grade,
      status: file.status,
      questionCount: file.questionCount,
      errorMsg: file.errorMsg,
      createdAt: file.createdAt,
    };
  }

  private async extractText(
    file: Express.Multer.File,
    ext: string,
  ): Promise<string | undefined> {
    switch (ext) {
      case 'md':
        return file.buffer.toString('utf-8');

      case 'docx': {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        return result.value?.trim() || undefined;
      }

      case 'pdf': {
        const data = await pdfParse(file.buffer);
        return data.text?.trim() || undefined;
      }

      // Images — handled by OCR in the pipeline
      default:
        return undefined;
    }
  }
}
