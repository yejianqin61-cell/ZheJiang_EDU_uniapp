import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Paper } from '../../database/entities/paper.entity';
import { Order } from '../../database/entities/order.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Paper)
    private readonly paperRepo: Repository<Paper>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 10003, message: '用户不存在' });
    return {
      id: user.id,
      role: user.role,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
    };
  }

  async getStats(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalPapers, totalPaid, todayPapers] = await Promise.all([
      this.paperRepo.count({ where: { userId } }),
      this.orderRepo.count({ where: { userId, status: 'paid' } }),
      this.paperRepo.count({
        where: { userId, createdAt: Between(today, tomorrow) },
      }),
    ]);

    // Regenerates today = papers created today minus the first one (if any were created today)
    const todayRegenerates = Math.max(0, todayPapers - 1);

    return { totalPapers, totalPaid, todayRegenerates };
  }
}
