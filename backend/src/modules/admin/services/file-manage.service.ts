import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KbFile } from '../../../database/entities/kb-file.entity';
import { Question } from '../../../database/entities/question.entity';
import { PaginatedResult } from '../../../common/dto/pagination.dto';

@Injectable()
export class FileManageService {
  constructor(
    @InjectRepository(KbFile)
    private readonly fileRepo: Repository<KbFile>,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
  ) {}

  async list(
    page: number,
    pageSize: number,
    status?: string,
  ): Promise<PaginatedResult<KbFile>> {
    const qb = this.fileRepo.createQueryBuilder('f');

    if (status) qb.andWhere('f.status = :status', { status });

    qb.orderBy('f.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();

    return {
      list,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async delete(fileId: string) {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) throw new NotFoundException({ code: 60001, message: '文件不存在' });

    // Soft-delete all associated questions
    await this.questionRepo.update(
      { sourceFileId: fileId, isDeleted: false },
      { isDeleted: true },
    );

    // Delete file record
    await this.fileRepo.remove(file);

    return { deleted: true };
  }
}
