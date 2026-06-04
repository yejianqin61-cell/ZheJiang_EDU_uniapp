/**
 * UserService 单元测试 — 用户资料与统计
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '../../database/entities/user.entity';
import { Paper } from '../../database/entities/paper.entity';
import { Order } from '../../database/entities/order.entity';
import { mockRepo, createUser } from '../../test-utils';

describe('UserService', () => {
  let service: UserService;
  let userRepo: any;
  let paperRepo: any;
  let orderRepo: any;

  beforeEach(async () => {
    userRepo = mockRepo();
    paperRepo = mockRepo();
    orderRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Paper), useValue: paperRepo },
        { provide: getRepositoryToken(Order), useValue: orderRepo },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  // ═══════════════════════════════════════════════════════════
  // getProfile
  // ═══════════════════════════════════════════════════════════

  describe('getProfile', () => {
    it('should return user profile', async () => {
      userRepo.findOne.mockResolvedValue(createUser());

      const result = await service.getProfile('user-1');

      expect(result.id).toBe('user-1');
      expect(result.role).toBe('teacher');
      expect(result.nickname).toBe('测试教师');
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });

    it('should not expose openid in profile', async () => {
      userRepo.findOne.mockResolvedValue(createUser({ openid: 'secret-openid' }));

      const result = await service.getProfile('user-1');

      expect((result as any).openid).toBeUndefined();
    });

    it('should return avatarUrl for user with avatar', async () => {
      userRepo.findOne.mockResolvedValue(createUser({ avatarUrl: 'https://img.example.com/avatar.jpg' }));

      const result = await service.getProfile('user-1');

      expect(result.avatarUrl).toBe('https://img.example.com/avatar.jpg');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // getStats
  // ═══════════════════════════════════════════════════════════

  describe('getStats', () => {
    it('should return paper and paid order counts', async () => {
      paperRepo.createQueryBuilder().getCount.mockResolvedValue(5);
      orderRepo.createQueryBuilder().getCount.mockResolvedValue(3);

      const result = await service.getStats('user-1');

      expect(result.totalPapers).toBe(5);
      expect(result.totalPaid).toBe(3);
    });

    it('should return zero counts for new user', async () => {
      paperRepo.createQueryBuilder().getCount.mockResolvedValue(0);
      orderRepo.createQueryBuilder().getCount.mockResolvedValue(0);

      const result = await service.getStats('new-user');

      expect(result.totalPapers).toBe(0);
      expect(result.totalPaid).toBe(0);
    });

    it('should return non-zero papers but zero paid', async () => {
      paperRepo.createQueryBuilder().getCount.mockResolvedValue(3);
      orderRepo.createQueryBuilder().getCount.mockResolvedValue(0);

      const result = await service.getStats('user-1');

      expect(result.totalPapers).toBe(3);
      expect(result.totalPaid).toBe(0);
    });
  });
});
