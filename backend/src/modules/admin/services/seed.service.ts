import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../../../database/entities/question.entity';
import { User } from '../../../database/entities/user.entity';
import { EmbeddingService } from '../../knowledge-base/services/embedding.service';

const SAMPLE_QUESTIONS = [
  {
    type: 'single_choice', subject: '数学', grade: '五年级', difficulty: 1,
    content: '下列分数中最大的是（ ）',
    options: ['A. 1/2', 'B. 2/3', 'C. 3/4', 'D. 5/6'],
    answer: 'D', analysis: '通分后比较：1/2=6/12, 2/3=8/12, 3/4=9/12, 5/6=10/12，最大为5/6。',
  },
  {
    type: 'single_choice', subject: '数学', grade: '五年级', difficulty: 1,
    content: '0.25化为分数是（ ）',
    options: ['A. 1/2', 'B. 1/3', 'C. 1/4', 'D. 1/5'],
    answer: 'C', analysis: '0.25 = 25/100 = 1/4。',
  },
  {
    type: 'fill_blank', subject: '数学', grade: '五年级', difficulty: 2,
    content: '一个三角形的底是6cm，高是4cm，它的面积是（ ）平方厘米。',
    options: [],
    answer: '12', analysis: '三角形面积 = 底 × 高 ÷ 2 = 6 × 4 ÷ 2 = 12。',
  },
  {
    type: 'single_choice', subject: '数学', grade: '五年级', difficulty: 2,
    content: '一个数除以0.01，等于这个数（ ）',
    options: ['A. 乘100', 'B. 除以100', 'C. 乘10', 'D. 除以10'],
    answer: 'A', analysis: '除以0.01相当于乘100，因为0.01 = 1/100。',
  },
  {
    type: 'short_answer', subject: '数学', grade: '五年级', difficulty: 3,
    content: '甲、乙两车同时从A、B两地相对开出，甲车每小时行60千米，乙车每小时行50千米，4小时后两车相遇。A、B两地相距多少千米？',
    options: [],
    answer: '440', analysis: '相遇问题：路程 = (速度和) × 时间 = (60+50) × 4 = 440千米。',
  },
  {
    type: 'single_choice', subject: '数学', grade: '五年级', difficulty: 1,
    content: '3.14 × 100 =（ ）',
    options: ['A. 3.14', 'B. 31.4', 'C. 314', 'D. 3140'],
    answer: 'C', analysis: '小数点向右移动两位：3.14 × 100 = 314。',
  },
  {
    type: 'fill_blank', subject: '数学', grade: '五年级', difficulty: 2,
    content: '把3米长的绳子平均分成5段，每段长（ ）米，每段占全长的（ ）。',
    options: [],
    answer: '0.6 或 3/5；1/5', analysis: '每段长 = 3÷5 = 0.6米 = 3/5米；每段占全长 = 1/5。',
  },
  {
    type: 'single_choice', subject: '数学', grade: '五年级', difficulty: 2,
    content: '一个正方体的棱长扩大到原来的3倍，它的体积扩大到原来的（ ）倍。',
    options: ['A. 3', 'B. 6', 'C. 9', 'D. 27'],
    answer: 'D', analysis: '正方体体积 = 棱长³，棱长×3 → 体积×3³ = 27。',
  },
  {
    type: 'true_false', subject: '数学', grade: '五年级', difficulty: 1,
    content: '所有的质数都是奇数。（ ）',
    options: [],
    answer: '错误', analysis: '2是质数但不是奇数。',
  },
  {
    type: 'short_answer', subject: '数学', grade: '五年级', difficulty: 3,
    content: '一个长方体水箱，从里面量长8分米，宽5分米，高6分米。这个水箱最多能装水多少升？',
    options: [],
    answer: '240', analysis: '体积 = 8×5×6 = 240立方分米 = 240升。',
  },
];

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async seed(): Promise<{ inserted: number }> {
    // Check if data already exists
    const count = await this.questionRepo.count({ where: { status: 'approved', isDeleted: false } });
    if (count >= 10) {
      return { inserted: 0 };
    }

    for (const q of SAMPLE_QUESTIONS) {
      let embedding: number[] | null = null;
      try {
        embedding = await this.embeddingService.embed(q.content);
      } catch { /* embedding API unavailable, use null */ }
      await this.questionRepo.save(
        this.questionRepo.create({
          ...q,
          embedding: embedding as any,
          status: 'approved',
          isDeleted: false,
        }),
      );
    }

    return { inserted: await this.questionRepo.count({ where: { status: 'approved' } }) };
  }

  async setUserRole(userId: string, role: string): Promise<{ userId: string; role: string }> {
    if (!['admin', 'teacher'].includes(role)) {
      throw new BadRequestException({ code: 70001, message: '无效的角色，仅支持 admin 或 teacher' });
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({ code: 70002, message: '用户不存在' });
    }

    await this.userRepo.update(userId, { role: role as 'admin' | 'teacher' });
    return { userId, role };
  }
}
