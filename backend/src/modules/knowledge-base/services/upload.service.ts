import { Injectable, Optional, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { KbFile } from '../../../database/entities/kb-file.entity';

const ALLOWED_EXTS = ['doc', 'docx', 'md', 'pdf', 'png', 'jpg', 'jpeg'];
const MAX_SIZE_TEXT = 50 * 1024 * 1024;
const MAX_SIZE_IMAGE = 10 * 1024 * 1024;
const IMAGE_EXTS = ['png', 'jpg', 'jpeg'];
const TEXT_EXTS = ['md'];

@Injectable()
export class UploadService {
  constructor(
    @InjectRepository(KbFile)
    private readonly fileRepo: Repository<KbFile>,
    @Optional()
    @InjectQueue('kb-processing')
    private readonly kbQueue?: Queue,
  ) {}

  async upload(
    uploaderId: string,
    file: Express.Multer.File,
    subject: string,
    grade: string,
    pipeline?: (fileId: string, rawText?: string) => Promise<void>,
  ) {
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTS.includes(ext)) {
      throw new BadRequestException({ code: 60001, message: `不支持的文件格式: .${ext}` });
    }

    const isImage = IMAGE_EXTS.includes(ext);
    const maxSize = isImage ? MAX_SIZE_IMAGE : MAX_SIZE_TEXT;
    if (file.size > maxSize) {
      throw new BadRequestException({ code: 60002, message: '文件大小超出限制' });
    }

    // Dev: read text content locally. Prod: COS URL.
    let cosUrl: string;
    let rawText: string | undefined;

    if (TEXT_EXTS.includes(ext)) {
      rawText = file.buffer.toString('utf-8');
      cosUrl = `local://${file.originalname}`;
    } else {
      rawText = this.tryExtractText(file, ext);
      cosUrl = `local://${file.originalname}`;
    }

    const kbFile = await this.fileRepo.save(
      this.fileRepo.create({
        uploaderId,
        filename: file.originalname,
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
        needOCR: isImage,
      });
    } else if (pipeline) {
      // Synchronous dev path — fire and forget (don't await)
      pipeline(kbFile.id, rawText).catch((err) => {
        console.error(`Pipeline failed for file ${kbFile.id}:`, err.message);
      });
    }

    return {
      fileId: kbFile.id,
      filename: kbFile.filename,
      status: kbFile.status,
    };
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

  private tryExtractText(file: Express.Multer.File, ext: string): string | undefined {
    // MD and plain text files: read directly
    if (TEXT_EXTS.includes(ext)) {
      return file.buffer.toString('utf-8');
    }
    // DOCX, PDF: need dedicated parser — return undefined for now, pipeline will handle
    return undefined;
  }
}
