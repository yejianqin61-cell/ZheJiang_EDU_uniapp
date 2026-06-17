import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Withdrawal } from '../../../database/entities/withdrawal.entity';
import { User } from '../../../database/entities/user.entity';
import { BalanceService } from './balance.service';

const MIN_WITHDRAWAL = 1000; // ¥10.00 minimum

@Injectable()
export class WithdrawalService {
  constructor(
    @InjectRepository(Withdrawal)
    private readonly repo: Repository<Withdrawal>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly balanceService: BalanceService,
  ) {}

  // ── User: create withdrawal request ─────────────────────────

  async create(userId: string, amount: number) {
    if (amount < MIN_WITHDRAWAL) {
      throw new BadRequestException({ code: 30010, message: `最低提现金额为 ¥${(MIN_WITHDRAWAL / 100).toFixed(2)}` });
    }

    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'balance'] });
    if (!user) throw new NotFoundException({ code: 10003, message: '用户不存在' });

    if (amount > user.balance) {
      throw new BadRequestException({ code: 30011, message: '提现金额超过余额' });
    }

    // Prevent duplicate pending requests
    const existing = await this.repo.findOne({
      where: { userId, status: 'pending' },
    });
    if (existing) {
      throw new ConflictException({ code: 30012, message: '您已有待审核的提现申请' });
    }

    const withdrawal = await this.repo.save(
      this.repo.create({ userId, amount, status: 'pending' }),
    );

    return {
      withdrawalId: withdrawal.id,
      amount: withdrawal.amount,
      status: withdrawal.status,
    };
  }

  // ── User: list own withdrawals ──────────────────────────────

  async listByUser(userId: string, page: number, pageSize: number) {
    const [list, total] = await this.repo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      list: list.map((w) => ({
        id: w.id,
        amount: w.amount,
        status: w.status,
        rejectReason: w.rejectReason,
        reviewedAt: w.reviewedAt,
        createdAt: w.createdAt,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ── Admin: list all withdrawals ─────────────────────────────

  async listAll(page: number, pageSize: number, status?: string) {
    const qb = this.repo
      .createQueryBuilder('w')
      .leftJoin('w.user', 'u')
      .select(['w', 'u.id', 'u.nickname', 'u.balance'])
      .orderBy('w.createdAt', 'DESC');

    if (status) qb.andWhere('w.status = :status', { status });

    qb.skip((page - 1) * pageSize).take(pageSize);

    const [list, total] = await qb.getManyAndCount();

    return {
      list: list.map((w) => ({
        id: w.id,
        userName: (w.user as any)?.nickname ?? '',
        amount: w.amount,
        balance: (w.user as any)?.balance ?? 0,
        status: w.status,
        rejectReason: w.rejectReason,
        reviewedAt: w.reviewedAt,
        createdAt: w.createdAt,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ── Admin: review withdrawal ────────────────────────────────

  async review(withdrawalId: string, reviewerId: string, action: 'approve' | 'reject', rejectReason?: string) {
    const withdrawal = await this.repo.findOne({ where: { id: withdrawalId } });
    if (!withdrawal) throw new NotFoundException({ code: 30013, message: '提现申请不存在' });
    if (withdrawal.status !== 'pending') {
      throw new ConflictException({ code: 30014, message: '该申请已处理' });
    }

    const now = new Date();

    if (action === 'approve') {
      // Deduct balance
      await this.balanceService.addBalance({
        userId: withdrawal.userId,
        amount: -withdrawal.amount,
        type: 'withdraw',
        refId: withdrawal.id,
        note: `提现到账 ¥${(withdrawal.amount / 100).toFixed(2)}`,
      });

      await this.repo.update(withdrawalId, {
        status: 'completed',
        reviewedBy: reviewerId,
        reviewedAt: now,
      });
    } else {
      await this.repo.update(withdrawalId, {
        status: 'rejected',
        reviewedBy: reviewerId,
        reviewedAt: now,
        rejectReason: rejectReason ?? '管理员拒绝',
      });
    }
  }
}
