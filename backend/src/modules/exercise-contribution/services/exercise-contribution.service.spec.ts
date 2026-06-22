import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { ExerciseContributionService } from './exercise-contribution.service';
import { TeacherExerciseUpload } from '../../../database/entities/teacher-exercise-upload.entity';
import { ExercisePaper } from '../../../database/entities/exercise-paper.entity';
import { ExerciseCategory } from '../../../database/entities/exercise-category.entity';
import { ExerciseLesson } from '../../../database/entities/exercise-lesson.entity';
import { PricingService } from '../../print/services/pricing.service';
import { BalanceService } from '../../balance/services/balance.service';
import { ThumbnailService } from '../../exercise/services/thumbnail.service';
import * as fs from 'fs';

describe('ExerciseContributionService', () => {
  let service: ExerciseContributionService;
  let uploadRepo: any;
  let paperRepo: any;
  let categoryRepo: any;
  let lessonRepo: any;
  let pricingService: any;
  let balanceService: any;
  let thumbnailService: { generate: jest.Mock };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    uploadRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn(async (entity: any) => ({ id: entity.id ?? 'upload-1', ...entity })),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    paperRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn(async (entity: any) => ({ id: 'paper-1', ...entity })),
    };
    categoryRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    lessonRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    pricingService = {
      getExerciseCashbackPrice: jest.fn().mockResolvedValue(500),
    };
    balanceService = {
      addBalance: jest.fn().mockResolvedValue({ balance: 1500 }),
    };
    thumbnailService = {
      generate: jest.fn().mockResolvedValue('/uploads/thumb.png'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExerciseContributionService,
        { provide: getRepositoryToken(TeacherExerciseUpload), useValue: uploadRepo },
        { provide: getRepositoryToken(ExercisePaper), useValue: paperRepo },
        { provide: getRepositoryToken(ExerciseCategory), useValue: categoryRepo },
        { provide: getRepositoryToken(ExerciseLesson), useValue: lessonRepo },
        { provide: PricingService, useValue: pricingService },
        { provide: BalanceService, useValue: balanceService },
        { provide: ThumbnailService, useValue: thumbnailService },
      ],
    }).compile();

    service = module.get<ExerciseContributionService>(ExerciseContributionService);
  });

  describe('approve', () => {
    it('should approve a pending upload, create exercise paper, and grant cashback', async () => {
      uploadRepo.findOne.mockResolvedValue({
        id: 'upload-1',
        userId: 'teacher-1',
        title: '五年级数学同步练习',
        fileUrl: '/uploads/exercises/file.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        thumbnailUrl: '/uploads/thumb.png',
        categoryId: 'cat-1',
        lessonId: 'lesson-1',
        status: 'pending_review',
      });

      const result = await service.approve('upload-1', 'admin-1');

      expect(pricingService.getExerciseCashbackPrice).toHaveBeenCalled();
      expect(uploadRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        status: 'approved',
        cashbackAmount: 500,
        reviewedBy: 'admin-1',
      }));
      expect(paperRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        title: '五年级数学同步练习',
        createdBy: 'teacher-1',
      }));
      expect(balanceService.addBalance).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'teacher-1',
        amount: 500,
        type: 'exercise_cashback',
      }));
      expect(result).toEqual({ paperId: 'paper-1', cashbackAmount: 500 });
    });

    it('should reject approval when upload does not exist', async () => {
      uploadRepo.findOne.mockResolvedValue(null);

      await expect(service.approve('missing', 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should reject approval when upload is not pending', async () => {
      uploadRepo.findOne.mockResolvedValue({ id: 'upload-1', status: 'approved' });

      await expect(service.approve('upload-1', 'admin-1')).rejects.toThrow(ConflictException);
    });

    it('should log warning and keep approval success when cashback fails', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      balanceService.addBalance.mockRejectedValue(new Error('cashback failed'));
      uploadRepo.findOne.mockResolvedValue({
        id: 'upload-1',
        userId: 'teacher-1',
        title: '五年级数学同步练习',
        fileUrl: '/uploads/exercises/file.pdf',
        fileType: 'pdf',
        fileSize: 1024,
        thumbnailUrl: '/uploads/thumb.png',
        categoryId: 'cat-1',
        lessonId: 'lesson-1',
        status: 'pending_review',
      });

      const result = await service.approve('upload-1', 'admin-1');

      expect(result).toEqual({ paperId: 'paper-1', cashbackAmount: 500 });
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to grant exercise cashback for upload upload-1',
        expect.any(String),
      );
    });
  });

  describe('upload', () => {
    it('should log warning and keep upload success when thumbnail generation fails', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
      thumbnailService.generate.mockRejectedValue(new Error('thumbnail failed'));

      const result = await service.upload(
        'teacher-1',
        { filename: 'exercise.pdf', buffer: Buffer.from('pdf'), size: 3 },
        { title: '同步练习', subject: '数学', grade: '五年级', exerciseType: '同步练习' },
      );

      await new Promise(process.nextTick);

      expect(result).toEqual({ id: 'upload-1', status: 'pending_review' });
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to generate thumbnail for upload upload-1',
        expect.any(String),
      );
    });
  });

  describe('reject', () => {
    it('should reject a pending upload with review note', async () => {
      uploadRepo.findOne.mockResolvedValue({ id: 'upload-1', status: 'pending_review' });

      const result = await service.reject('upload-1', 'admin-1', '文件不清晰');

      expect(uploadRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        status: 'rejected',
        reviewNote: '文件不清晰',
        reviewedBy: 'admin-1',
      }));
      expect(result).toEqual({ status: 'rejected' });
    });
  });

  describe('delete', () => {
    it('should block deleting approved uploads', async () => {
      uploadRepo.findOne.mockResolvedValue({ id: 'upload-1', userId: 'teacher-1', status: 'approved' });

      await expect(service.delete('upload-1', 'teacher-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('batch actions', () => {
    it('should continue batch approval when one item fails', async () => {
      uploadRepo.findOne
        .mockResolvedValueOnce({
          id: 'upload-ok',
          userId: 'teacher-1',
          title: 'ok',
          fileUrl: '/uploads/ok.pdf',
          fileType: 'pdf',
          fileSize: 10,
          thumbnailUrl: null,
          categoryId: null,
          lessonId: null,
          status: 'pending_review',
        })
        .mockResolvedValueOnce(null);

      const result = await service.batchApprove(['upload-ok', 'upload-missing'], 'admin-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'upload-ok', success: true });
      expect(result[1].id).toBe('upload-missing');
      expect(result[1].success).toBe(false);
    });

    it('should continue batch rejection when one item fails', async () => {
      uploadRepo.findOne
        .mockResolvedValueOnce({ id: 'upload-ok', status: 'pending_review' })
        .mockResolvedValueOnce({ id: 'upload-bad', status: 'approved' });

      const result = await service.batchReject(['upload-ok', 'upload-bad'], 'admin-1', 'note');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'upload-ok', success: true });
      expect(result[1].id).toBe('upload-bad');
      expect(result[1].success).toBe(false);
    });
  });
});
