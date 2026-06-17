import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BalanceLog } from '../../../database/entities/balance-log.entity';
import { User } from '../../../database/entities/user.entity';

@Injectable()
export class BalanceService {
  constructor(
    @InjectRepository(BalanceLog)
    private readonly logRepo: Repository<BalanceLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ── Get balance ─────────────────────────────────────────────

  async getBalance(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'balance'] });

    const earned = await this.logRepo
      .createQueryBuilder('l')
      .select('COALESCE(SUM(l.amount), 0)', 'total')
      .where('l.userId = :userId AND l.amount > 0', { userId })
      .getRawOne();

    const spent = await this.logRepo
      .createQueryBuilder('l')
      .select('COALESCE(SUM(ABS(l.amount)), 0)', 'total')
      .where('l.userId = :userId AND l.amount < 0', { userId })
      .getRawOne();

    return {
      balance: user?.balance ?? 0,
      totalEarned: parseInt(earned?.total ?? '0', 10),
      totalSpent: parseInt(spent?.total ?? '0', 10),
    };
  }

  // ── Balance log ─────────────────────────────────────────────

  async getLog(userId: string, page: number, pageSize: number, type?: string) {
    const qb = this.logRepo
      .createQueryBuilder('l')
      .where('l.userId = :userId', { userId });

    if (type) qb.andWhere('l.type = :type', { type });

    qb.orderBy('l.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();

    return {
      list: list.map((l) => ({
        id: l.id,
        amount: l.amount,
        type: l.type,
        note: l.note,
        balanceAfter: l.balanceAfter,
        createdAt: l.createdAt,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ── Internal: add balance ───────────────────────────────────

  /**
   * Add amount to user balance and write log.
   * Called by ReviewService on approve, PaymentService on balance pay, WithdrawalService on approve.
   */
  async addBalance(params: {
    userId: string;
    amount: number;     // positive=earn, negative=spend
    type: 'cashback' | 'pay_order' | 'withdraw' | 'admin_adjust';
    refId?: string;
    note: string;
  }) {
    const user = await this.userRepo.findOne({ where: { id: params.userId }, select: ['id', 'balance'] });
    if (!user) throw new BadRequestException({ code: 10003, message: '用户不存在' });

    const newBalance = user.balance + params.amount;
    if (newBalance < 0) {
      throw new BadRequestException({ code: 30006, message: '余额不足' });
    }

    await this.userRepo.update(params.userId, { balance: newBalance });

    await this.logRepo.save(
      this.logRepo.create({
        userId: params.userId,
        amount: params.amount,
        type: params.type,
        refId: params.refId ?? null,
        balanceAfter: newBalance,
        note: params.note,
      }),
    );

    return { balance: newBalance };
  }
}
