import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
    // TODO: implement stats queries against paper and order tables
    return {
      totalPapers: 0,
      totalPaid: 0,
      todayRegenerates: 0,
    };
  }
}
