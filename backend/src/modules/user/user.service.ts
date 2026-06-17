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
      phone: user.phone ? user.phone.slice(0, 3) + '****' + user.phone.slice(-4) : null,
    };
  }

  async getStats(userId: string) {
    const totalPapers = await this.paperRepo.createQueryBuilder('p')
      .where('p.user_id = :uid', { uid: userId })
      .getCount();

    const totalPaid = await this.orderRepo.createQueryBuilder('o')
      .where('o.user_id = :uid', { uid: userId })
      .andWhere('o.status = :st', { st: 'paid' })
      .getCount();

    return { totalPapers, totalPaid };
  }
}
