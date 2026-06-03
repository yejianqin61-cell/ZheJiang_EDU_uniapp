import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Order } from '../../database/entities/order.entity';
import { Paper } from '../../database/entities/paper.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Paper)
    private readonly paperRepo: Repository<Paper>,
    private readonly config: ConfigService,
  ) {}

  // ── O-01: Create order ────────────────────────────────────

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

    // wxPayParams is populated by OrderController via PaymentService.createPayment().
    // See OrderController.create() for the Order→Payment linkage.

    return {
      orderId: order.id,
      orderNo: order.orderNo,
      amount: order.amount,
      wxPayParams: null, // filled by controller layer
    };
  }

  // ── O-03/O-04: List with filters ──────────────────────────

  async list(params: {
    userId: string;
    page: number;
    pageSize: number;
    subject?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { userId, page, pageSize, subject, status, startDate, endDate } = params;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.userId = :userId', { userId });

    if (status) {
      qb.andWhere('o.status = :status', { status });
    }

    // Subject filter: load matching paperIds first, then filter orders.
    // conditions is stored as simple-json TEXT in the paper table.
    if (subject) {
      const matchingPapers = await this.paperRepo
        .createQueryBuilder('p')
        .select('p.id')
        .where("p.conditions LIKE :pattern", { pattern: `%"subject":"${subject}"%` })
        .getMany();
      const paperIds = matchingPapers.map((p) => p.id);
      if (paperIds.length > 0) {
        qb.andWhere('o.paperId IN (:...paperIds)', { paperIds });
      } else {
        // No papers match this subject — return empty
        return {
          list: [],
          pagination: { page, pageSize, total: 0, totalPages: 0 },
        };
      }
    }

    // Time range filter
    if (startDate) {
      qb.andWhere('o.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('o.createdAt <= :endDate', { endDate });
    }

    qb.orderBy('o.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();

    // Load paper titles separately (avoid SQL.js join issues)
    const paperIds = [...new Set(list.map((o) => o.paperId))];
    const papers = paperIds.length > 0
      ? await this.paperRepo.createQueryBuilder('p').select(['p.id', 'p.title']).where('p.id IN (:...ids)', { ids: paperIds }).getMany()
      : [];
    const titleMap = new Map(papers.map((p) => [p.id, p.title]));

    return {
      list: list.map((o) => ({
        orderId: o.id,
        orderNo: o.orderNo,
        paperTitle: titleMap.get(o.paperId) ?? '',
        amount: o.amount,
        status: o.status,
        createdAt: o.createdAt,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ── Order detail ──────────────────────────────────────────

  async getDetail(orderId: string, userId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId },
    });
    if (!order) throw new NotFoundException({ code: 50001, message: '订单不存在' });

    const paper = await this.paperRepo.findOne({ where: { id: order.paperId }, select: ['id', 'title', 'exportDocxUrl', 'exportPdfUrl'] });

    return {
      orderId: order.id,
      orderNo: order.orderNo,
      paperId: order.paperId,
      paperTitle: paper?.title ?? '',
      amount: order.amount,
      status: order.status,
      paidAt: order.paidAt,
      expiredAt: order.expiredAt,
      createdAt: order.createdAt,
    };
  }

  // ── O-05: Redownload ──────────────────────────────────────

  async getDownloadUrl(orderId: string, userId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId },
    });
    if (!order) throw new NotFoundException({ code: 50001, message: '订单不存在' });
    if (order.status !== 'paid') throw new ConflictException({ code: 40001, message: '请先完成支付' });

    const paper = await this.paperRepo.findOne({ where: { id: order.paperId }, select: ['id', 'exportDocxUrl', 'exportPdfUrl'] });

    return {
      docxUrl: paper?.exportDocxUrl ?? null,
      pdfUrl: paper?.exportPdfUrl ?? null,
    };
  }

  // ── O-02: Auto-cancel expired pending orders ──────────────

  /**
   * Cancel orders that have been pending for more than 30 minutes.
   * Called by Cron every 5 minutes and on-demand before listing.
   */
  async cancelExpiredOrders(): Promise<number> {
    const now = new Date();
    // pending → cancelled if expired_at has passed
    const result = await this.orderRepo.update(
      { status: 'pending', expiredAt: LessThan(now) },
      { status: 'cancelled' },
    );
    return result.affected ?? 0;
  }

  // ── O-06: Cleanup (Cron: daily) ───────────────────────────

  /**
   * Physically delete pending/cancelled/expired orders older than 7 days.
   * Paid orders are never deleted.
   */
  @Cron('0 3 * * *') // 3:00 AM daily
  async cleanupOldOrders(): Promise<number> {
    const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    let count = 0;
    for (const status of ['cancelled', 'expired']) {
      const result = await this.orderRepo.delete({
        status,
        createdAt: LessThan(cutoff),
      });
      count += result.affected ?? 0;
    }
    return count;
  }

  // ── Helpers ───────────────────────────────────────────────

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
