import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BalanceService } from './balance.service';
import { BalanceLog } from '../../../database/entities/balance-log.entity';
import { User } from '../../../database/entities/user.entity';
import { BadRequestException } from '@nestjs/common';

describe('BalanceService', () => {
  let service: BalanceService;
  let logRepo: any;
  let userRepo: any;

  beforeEach(async () => {
    logRepo = {
      find: jest.fn(), findAndCount: jest.fn(), save: jest.fn(),
      create: jest.fn((d: any) => d), count: jest.fn(), update: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      }),
    };
    userRepo = { findOne: jest.fn(), update: jest.fn().mockResolvedValue({ affected: 1 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalanceService,
        { provide: getRepositoryToken(BalanceLog), useValue: logRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();
    service = module.get<BalanceService>(BalanceService);
  });

  // ═════════════════════════════════════════════════
  describe('getBalance', () => {
    it('should return zero balance for new user', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1', balance: 0 });
      const result = await service.getBalance('u1');
      expect(result.balance).toBe(0);
      expect(result.totalEarned).toBe(0);
      expect(result.totalSpent).toBe(0);
    });

    it('should return balance with totals', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1', balance: 5000 });
      const qb = logRepo.createQueryBuilder();
      qb.getRawOne.mockResolvedValueOnce({ total: '10000' });  // earned
      qb.getRawOne.mockResolvedValueOnce({ total: '5000' });   // spent

      const result = await service.getBalance('u1');
      expect(result.balance).toBe(5000);
    });
  });

  // ═════════════════════════════════════════════════
  describe('getLog', () => {
    it('should return paginated log', async () => {
      const qb = logRepo.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([
        [{ id: 'l1', amount: 100, type: 'cashback', note: 'test', balanceAfter: 100, createdAt: new Date() }],
        1,
      ]);
      const result = await service.getLog('u1', 1, 10);
      expect(result.list).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by type', async () => {
      const qb = logRepo.createQueryBuilder();
      await service.getLog('u1', 1, 10, 'cashback');
      expect(qb.andWhere).toHaveBeenCalled();
    });
  });

  // ═════════════════════════════════════════════════
  describe('addBalance', () => {
    it('should add cashback and write log', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1', balance: 1000 });
      const result = await service.addBalance({
        userId: 'u1', amount: 100, type: 'cashback',
        refId: 'q1', note: '题目审核通过',
      });
      expect(result.balance).toBe(1100);
      expect(userRepo.update).toHaveBeenCalledWith('u1', { balance: 1100 });
      expect(logRepo.save).toHaveBeenCalled();
    });

    it('should deduct on payment', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1', balance: 1000 });
      const result = await service.addBalance({
        userId: 'u1', amount: -500, type: 'pay_order',
        refId: 'o1', note: '余额支付',
      });
      expect(result.balance).toBe(500);
    });

    it('should throw if balance would go negative', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1', balance: 100 });
      await expect(service.addBalance({
        userId: 'u1', amount: -500, type: 'withdraw',
        refId: 'w1', note: '提现',
      })).rejects.toThrow(BadRequestException);
    });
  });
});
