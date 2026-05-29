import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Order } from '../../database/entities/order.entity';
import { Paper } from '../../database/entities/paper.entity';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Paper)
    private readonly paperRepo: Repository<Paper>,
    private readonly config: ConfigService,
  ) {}

  async create(userId: string, paperId: string) {
    const paper = await this.paperRepo.findOne({ where: { id: paperId } });
    if (!paper) throw new NotFoundException({ code: 30001, message: '试卷不存在' });

    const existing = await this.orderRepo.findOne({
      where: { userId, paperId, status: 'pending' },
    });
    if (existing) throw new ConflictException({ code: 30002, message: '该试卷已有未支付订单' });

    const amount = this.config.get<number>('paper.price', 500);
    const orderNo = this.generateOrderNo();

    const order = await this.orderRepo.save(
      this.orderRepo.create({
        userId,
        paperId,
        orderNo,
        amount,
        status: 'pending',
        expiredAt: new Date(Date.now() + 24 * 3600 * 1000),
      }),
    );

    return {
      orderId: order.id,
      orderNo: order.orderNo,
      amount: order.amount,
      wxPayParams: null, // TODO: call WeChat Pay unifiedOrder
    };
  }

  async list(
    userId: string,
    pagination: PaginationDto,
    subject?: string,
    status?: string,
  ): Promise<PaginatedResult<any>> {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.paper', 'p')
      .where('o.user_id = :userId', { userId });

    if (status) qb.andWhere('o.status = :status', { status });
    if (subject) qb.andWhere('p.conditions @> :subjectCond', { subjectCond: { subject } });

    qb.orderBy('o.created_at', 'DESC')
      .skip((pagination.page! - 1) * pagination.pageSize!)
      .take(pagination.pageSize);

    const [list, total] = await qb.getManyAndCount();

    return {
      list: list.map((o) => ({
        orderId: o.id,
        orderNo: o.orderNo,
        paperTitle: o.paper?.title ?? '',
        amount: o.amount,
        status: o.status,
        createdAt: o.createdAt,
      })),
      pagination: {
        page: pagination.page!,
        pageSize: pagination.pageSize!,
        total,
        totalPages: Math.ceil(total / pagination.pageSize!),
      },
    };
  }

  async getDownloadUrl(orderId: string, userId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId },
      relations: ['paper'],
    });
    if (!order) throw new NotFoundException({ code: 50001, message: '订单不存在' });
    if (order.status !== 'paid') throw new ConflictException({ code: 40001, message: '请先完成支付' });

    return {
      docxUrl: order.paper?.exportDocxUrl ?? null,
      pdfUrl: order.paper?.exportPdfUrl ?? null,
    };
  }

  private generateOrderNo(): string {
    const now = new Date();
    const y = now.getFullYear().toString();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    const h = now.getHours().toString().padStart(2, '0');
    const min = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');
    const rand = Math.random().toString().slice(2, 8);
    return `${y}${m}${d}${h}${min}${s}${rand}`;
  }
}
