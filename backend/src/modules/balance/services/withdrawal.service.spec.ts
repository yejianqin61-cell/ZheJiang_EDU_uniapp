import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WithdrawalService } from './withdrawal.service';
import { Withdrawal } from '../../../database/entities/withdrawal.entity';
import { User } from '../../../database/entities/user.entity';
import { BalanceService } from './balance.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('WithdrawalService', () => {
  let service: WithdrawalService;
  let repo: any;
  let userRepo: any;
  let balanceService: any;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(), findAndCount: jest.fn(), save: jest.fn(),
      create: jest.fn((d: any) => d), update: jest.fn().mockResolvedValue({ affected: 1 }),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(), getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };
    userRepo = { findOne: jest.fn() };
    balanceService = { addBalance: jest.fn().mockResolvedValue({ balance: 100 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalService,
        { provide: getRepositoryToken(Withdrawal), useValue: repo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: BalanceService, useValue: balanceService },
      ],
    }).compile();
    service = module.get<WithdrawalService>(WithdrawalService);
  });

  // ═════════════════════════════════════════════════
  describe('create', () => {
    it('should create withdrawal request', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1', balance: 5000 });
      repo.findOne.mockResolvedValue(null); // no existing pending
      repo.save.mockResolvedValue({ id: 'w1', amount: 2000, status: 'pending' });

      const result = await service.create('u1', 2000);
      expect(result.withdrawalId).toBe('w1');
      expect(result.status).toBe('pending');
    });

    it('should reject amount below minimum (1000 = ¥10)', async () => {
      await expect(service.create('u1', 500)).rejects.toThrow(BadRequestException);
    });

    it('should reject amount exceeding balance', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1', balance: 1000 });
      await expect(service.create('u1', 2000)).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate pending request', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1', balance: 5000 });
      repo.findOne.mockResolvedValue({ id: 'w1', status: 'pending' });
      await expect(service.create('u1', 2000)).rejects.toThrow(ConflictException);
    });
  });

  // ═════════════════════════════════════════════════
  describe('listByUser', () => {
    it('should return user withdrawals', async () => {
      repo.findAndCount.mockResolvedValue([
        [{ id: 'w1', amount: 2000, status: 'pending', rejectReason: null, reviewedAt: null, createdAt: new Date() }],
        1,
      ]);
      const result = await service.listByUser('u1', 1, 10);
      expect(result.list).toHaveLength(1);
    });
  });

  // ═════════════════════════════════════════════════
  describe('listAll (admin)', () => {
    it('should list all withdrawals with user info', async () => {
      const qb = repo.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([
        [{ id: 'w1', amount: 2000, status: 'pending', user: { nickname: '张老师', balance: 5000 }, rejectReason: null, reviewedAt: null, createdAt: new Date() }],
        1,
      ]);
      const result = await service.listAll(1, 10, 'pending');
      expect(result.list).toHaveLength(1);
      expect(result.list[0].userName).toBe('张老师');
    });
  });

  // ═════════════════════════════════════════════════
  describe('review', () => {
    it('should approve and deduct balance', async () => {
      repo.findOne.mockResolvedValue({ id: 'w1', userId: 'u1', amount: 2000, status: 'pending' });
      await service.review('w1', 'admin1', 'approve');
      expect(balanceService.addBalance).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u1', amount: -2000, type: 'withdraw',
      }));
      expect(repo.update).toHaveBeenCalledWith('w1', expect.objectContaining({ status: 'completed' }));
    });

    it('should reject without deducting', async () => {
      repo.findOne.mockResolvedValue({ id: 'w1', userId: 'u1', amount: 2000, status: 'pending' });
      await service.review('w1', 'admin1', 'reject', '余额异常');
      expect(balanceService.addBalance).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith('w1', expect.objectContaining({ status: 'rejected' }));
    });

    it('should throw if already processed', async () => {
      repo.findOne.mockResolvedValue({ id: 'w1', status: 'completed' });
      await expect(service.review('w1', 'admin1', 'approve')).rejects.toThrow(ConflictException);
    });

    it('should throw if not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.review('bad', 'admin1', 'approve')).rejects.toThrow(NotFoundException);
    });
  });
});
