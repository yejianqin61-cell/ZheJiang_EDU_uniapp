/**
 * FileManageService 单元测试 — 文件管理
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { FileManageService } from './file-manage.service';
import { KbFile } from '../../../database/entities/kb-file.entity';
import { Question } from '../../../database/entities/question.entity';
import { mockRepo, createKbFile } from '../../../test-utils';

describe('FileManageService', () => {
  let service: FileManageService;
  let fileRepo: any;
  let questionRepo: any;

  beforeEach(async () => {
    fileRepo = mockRepo();
    questionRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileManageService,
        { provide: getRepositoryToken(KbFile), useValue: fileRepo },
        { provide: getRepositoryToken(Question), useValue: questionRepo },
      ],
    }).compile();

    service = module.get<FileManageService>(FileManageService);
  });

  // ═══════════════════════════════════════════════════════════
  // list
  // ═══════════════════════════════════════════════════════════

  describe('list', () => {
    it('should return paginated files', async () => {
      fileRepo.createQueryBuilder().getManyAndCount.mockResolvedValue([
        [createKbFile(), createKbFile({ id: 'file-2', filename: '语文题库.md' })],
        2,
      ]);

      const result = await service.list(1, 20);

      expect(result.list).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by status', async () => {
      fileRepo.createQueryBuilder().getManyAndCount.mockResolvedValue([
        [createKbFile({ status: 'completed' })],
        1,
      ]);

      const result = await service.list(1, 20, 'completed');

      expect(result.list).toHaveLength(1);
    });

    it('should return empty list when no files', async () => {
      fileRepo.createQueryBuilder().getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.list(1, 20);

      expect(result.list).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // delete
  // ═══════════════════════════════════════════════════════════

  describe('delete', () => {
    it('should delete file and soft-delete associated questions', async () => {
      fileRepo.findOne.mockResolvedValue(createKbFile());

      const result = await service.delete('file-1');

      expect(result.deleted).toBe(true);
      // Should soft-delete questions
      expect(questionRepo.update).toHaveBeenCalledWith(
        { sourceFileId: 'file-1', isDeleted: false },
        { isDeleted: true },
      );
      // Should remove file record
      expect(fileRepo.remove).toHaveBeenCalled();
    });

    it('should throw NotFoundException when file not found', async () => {
      fileRepo.findOne.mockResolvedValue(null);

      await expect(service.delete('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });

    it('should handle file with no associated questions', async () => {
      fileRepo.findOne.mockResolvedValue(createKbFile());
      questionRepo.update.mockResolvedValue({ affected: 0 });

      const result = await service.delete('file-1');

      expect(result.deleted).toBe(true);
      expect(fileRepo.remove).toHaveBeenCalled();
    });
  });
});
