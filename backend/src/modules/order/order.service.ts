import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Order } from '../../database/entities/order.entity';
import { Paper } from '../../database/entities/paper.entity';
import { PricingService } from '../print/services/pricing.service';
import { ShippingAddressService } from '../print/services/shipping-address.service';

export interface CreateOrderParams {
  userId: string;
  paperId: string;
  type: 'download' | 'print';
  copies?: number;
  shippingAddressId?: string;
}

export interface ListOrdersParams {
  userId: string;
  page: number;
  pageSize: number;
  type?: string;
  scope?: 'mine' | 'others';
  subject?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Paper)
    private readonly paperRepo: Repository<Paper>,
    private readonly config: ConfigService,
    private readonly pricingService: PricingService,
    private readonly shippingAddressService: ShippingAddressService,
  ) {}

  // ── Create order (dual-mode) ───────────────────────────────

  async create(params: CreateOrderParams) {
    const { userId, paperId, type, copies, shippingAddressId } = params;

    const paper = await this.paperRepo.findOne({ where: { id: paperId } });
    if (!paper) throw new NotFoundException({ code: 30001, message: '试卷不存在' });

    // Prevent duplicate pending orders of the same type
    const existing = await this.orderRepo.findOne({
      where: { userId, paperId, type, status: 'pending' },
    });
    if (existing) throw new ConflictException({ code: 30002, message: '该试卷已有未支付的同类型订单' });

    const orderNo = this.generateOrderNo();
    let amount: number;
    let unitPrice: number;
    let pricingSnapshot: Record<string, any>;
    let shippingSnapshot: Record<string, any> | null = null;
    let cp: number | null = null;
    let addrId: string | null = null;

    if (type === 'download') {
      unitPrice = await this.pricingService.getDownloadPrice();
      const questionCount = Array.isArray(paper.questionIds) ? paper.questionIds.length : 20;
      amount = unitPrice * questionCount;
      pricingSnapshot = { type: 'download', unitPrice, questionCount, total: amount };
    } else if (type === 'print') {
      if (!copies || copies < 1) {
        throw new ConflictException({ code: 30007, message: '打印份数必须大于0' });
      }
      if (!shippingAddressId) {
        throw new ConflictException({ code: 30008, message: '请选择收货地址' });
      }

      const pricing = await this.pricingService.calculatePrintPrice(copies);
      unitPrice = pricing.unitPrice;
      amount = pricing.total;
      pricingSnapshot = { type: 'print', tier: pricing.tier, unitPrice, copies, total: amount };

      // Snapshot the shipping address
      shippingSnapshot = await this.shippingAddressService.snapshot(shippingAddressId, userId);
      cp = copies;
      addrId = shippingAddressId;
    } else {
      throw new ConflictException({ code: 30009, message: '无效的订单类型' });
    }

    const order = await this.orderRepo.save(
      this.orderRepo.create({
        userId,
        paperId,
        orderNo,
        type,
        amount,
        unitPrice,
        status: 'pending',
        copies: cp,
        shippingAddressId: addrId,
        shippingSnapshot,
        pricingSnapshot,
        printStatus: null,
        expiredAt: new Date(Date.now() + 24 * 3600 * 1000),
      }),
    );

    return {
      orderId: order.id,
      orderNo: order.orderNo,
      type: order.type,
      amount: order.amount,
      unitPrice: order.unitPrice,
      copies: order.copies,
      paperId: order.paperId,
      pricingDetail: pricingSnapshot,
      wxPayParams: null, // filled by controller
    };
  }

  // ── List with filters (type + scope) ───────────────────────

  async list(params: ListOrdersParams) {
    const { userId, page, pageSize, type, scope, subject, status, startDate, endDate } = params;

    const qb = this.orderRepo.createQueryBuilder('o');

    // Scope filter
    if (scope === 'others') {
      qb.where('o.userId != :userId', { userId });
    } else {
      // Default: mine only
      qb.where('o.userId = :userId', { userId });
    }

    // Type filter
    if (type && ['download', 'print'].includes(type)) {
      qb.andWhere('o.type = :type', { type });
    }

    // Status filter
    if (status) {
      qb.andWhere('o.status = :status', { status });
    }

    // Subject filter: load matching paperIds
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
        return { list: [], pagination: { page, pageSize, total: 0, totalPages: 0 } };
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

    // Load paper titles
    const paperIds = [...new Set(list.map((o) => o.paperId))];
    const papers = paperIds.length > 0
      ? await this.paperRepo.createQueryBuilder('p').select(['p.id', 'p.title']).where('p.id IN (:...ids)', { ids: paperIds }).getMany()
      : [];
    const titleMap = new Map(papers.map((p) => [p.id, p.title]));

    const isOwnOrders = scope !== 'others';

    return {
      list: list.map((o) => ({
        orderId: o.id,
        orderNo: o.orderNo,
        type: o.type,
        paperTitle: titleMap.get(o.paperId) ?? '',
        amount: o.amount,
        unitPrice: o.unitPrice,
        status: o.status,
        copies: o.copies,
        printStatus: o.printStatus,
        shipping: o.shippingSnapshot
          ? {
              receiverName: o.shippingSnapshot.receiverName,
              phone: this.maskPhone(o.shippingSnapshot.phone),
              fullAddress: `${o.shippingSnapshot.province}${o.shippingSnapshot.city}${o.shippingSnapshot.district}${o.shippingSnapshot.detail}`,
            }
          : undefined,
        hasExport: isOwnOrders ? !!(o.status === 'paid' || o.status === 'exported') : undefined,
        createdAt: o.createdAt,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ── Order detail ───────────────────────────────────────────

  async getDetail(orderId: string, userId: string, isAdmin: boolean = false) {
    const order = await this.orderRepo.findOne({
      where: isAdmin ? { id: orderId } : { id: orderId, userId },
    });
    if (!order) throw new NotFoundException({ code: 50001, message: '订单不存在' });

    const paper = await this.paperRepo.findOne({
      where: { id: order.paperId },
      select: ['id', 'title', 'questionIds', 'exportDocxUrl', 'exportPdfUrl'],
    });

    const baseInfo = {
      orderId: order.id,
      orderNo: order.orderNo,
      type: order.type,
      paperId: order.paperId,
      paperTitle: paper?.title ?? '',
      questionCount: Array.isArray(paper?.questionIds) ? paper.questionIds.length : 0,
      amount: order.amount,
      unitPrice: order.unitPrice,
      status: order.status,
      pricingSnapshot: order.pricingSnapshot,
      paidAt: order.paidAt,
      expiredAt: order.expiredAt,
      createdAt: order.createdAt,
    };

    if (order.type === 'download') {
      const isOwner = order.userId === userId;
      return {
        ...baseInfo,
        hasExport: isOwner ? !!(paper?.exportDocxUrl || paper?.exportPdfUrl) : false,
      };
    }

    // Print order
    return {
      ...baseInfo,
      copies: order.copies,
      printStatus: order.printStatus,
      shipping: order.shippingSnapshot
        ? {
            receiverName: order.shippingSnapshot.receiverName,
            phone: this.maskPhone(order.shippingSnapshot.phone),
            fullAddress: `${order.shippingSnapshot.province}${order.shippingSnapshot.city}${order.shippingSnapshot.district}${order.shippingSnapshot.detail}`,
          }
        : null,
      printStatusLog: this.buildPrintStatusLog(order),
    };
  }

  // ── Redownload ─────────────────────────────────────────────

  async getDownloadUrl(orderId: string, userId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId },
    });
    if (!order) throw new NotFoundException({ code: 50001, message: '订单不存在' });
    if (order.type !== 'download') {
      throw new ConflictException({ code: 40002, message: '打印订单不支持下载' });
    }
    if (order.status !== 'paid') throw new ConflictException({ code: 40001, message: '请先完成支付' });

    const paper = await this.paperRepo.findOne({ where: { id: order.paperId }, select: ['id', 'exportDocxUrl', 'exportPdfUrl'] });

    return {
      docxUrl: paper?.exportDocxUrl ?? null,
      pdfUrl: paper?.exportPdfUrl ?? null,
    };
  }

  // ── Auto-cancel expired pending orders ─────────────────────

  async cancelExpiredOrders(): Promise<number> {
    const now = new Date();
    const result = await this.orderRepo.update(
      { status: 'pending', expiredAt: LessThan(now) },
      { status: 'cancelled' },
    );
    return result.affected ?? 0;
  }

  // ── Cleanup (Cron: daily) ──────────────────────────────────

  @Cron('0 3 * * *')
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

  private maskPhone(phone: string): string {
    if (!phone || phone.length < 7) return phone;
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  }

  private buildPrintStatusLog(order: Order): Array<{ status: string; time: string }> {
    const log: Array<{ status: string; time: string }> = [];
    // print_status starts from null → printing → shipped → delivered
    // We only log the actual print_status changes (not null)
    // Since we don't track individual timestamps for each status change,
    // we infer from updatedAt for simplicity.
    if (order.printStatus) {
      log.push({ status: order.printStatus, time: (order.paidAt ?? order.updatedAt).toISOString() });
    }
    return log;
  }
}
