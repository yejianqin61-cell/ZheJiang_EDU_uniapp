import { Injectable, Optional, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { KbFile } from '../../../database/entities/kb-file.entity';

const ALLOWED_TYPES = ['doc', 'docx', 'md', 'pdf', 'png', 'jpg', 'jpeg'];
const MAX_SIZE_TEXT = 50 * 1024 * 1024;
const MAX_SIZE_IMAGE = 10 * 1024 * 1024;
const IMAGE_TYPES = ['png', 'jpg', 'jpeg'];

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
  ) {
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_TYPES.includes(ext)) {
      throw new BadRequestException({ code: 60001, message: '不支持的文件格式' });
    }

    const isImage = IMAGE_TYPES.includes(ext);
    const maxSize = isImage ? MAX_SIZE_IMAGE : MAX_SIZE_TEXT;
    if (file.size > maxSize) {
      throw new BadRequestException({ code: 60002, message: '文件大小超出限制' });
    }

    const cosUrl = `cos://placeholder/${file.originalname}`;

    const kbFile = await this.fileRepo.save(
      this.fileRepo.create({
        uploaderId,
        filename: file.originalname,
        fileType: ext,
        fileSize: file.size,
        subject,
        grade,
        cosUrl,
        status: 'uploading',
      }),
    );

    if (this.kbQueue) {
      await this.kbQueue.add('process-file', {
        fileId: kbFile.id,
        needOCR: isImage || ext === 'pdf',
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
      status: file.status,
      questionCount: file.questionCount,
      errorMsg: file.errorMsg,
      createdAt: file.createdAt,
    };
  }
}
