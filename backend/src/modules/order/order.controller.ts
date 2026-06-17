import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { IsString, IsOptional, IsInt, Min, IsIn } from 'class-validator';
import { OrderService } from './order.service';
import { PaymentService } from '../payment/payment.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

class CreateOrderDto {
  @IsString()
  paperId: string;

  @IsString()
  @IsIn(['download', 'print'])
  type: 'download' | 'print';

  @IsOptional()
  @IsInt()
  @Min(1)
  copies?: number;

  @IsOptional()
  @IsString()
  shippingAddressId?: string;
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService,
  ) {}

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    const order = await this.orderService.create({
      userId,
      paperId: dto.paperId,
      type: dto.type ?? 'download',
      copies: dto.copies,
      shippingAddressId: dto.shippingAddressId,
    });

    let payment: any = null;
    try {
      const result = await this.paymentService.createAlipayPayment(order.orderId);
      payment = { provider: 'alipay', payForm: result.payForm };
    } catch (err: any) {
      // Payment creation failed; order exists, user can retry
    }

    return { ...order, payment };
  }

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() pagination: PaginationDto,
    @Query('type') type?: string,
    @Query('scope') scope?: string,
    @Query('subject') subject?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    this.orderService.cancelExpiredOrders().catch(() => {});

    // Only admin can use scope=others
    const effectiveScope: 'mine' | 'others' = (role === 'admin' && scope === 'others')
      ? 'others'
      : 'mine';

    return this.orderService.list({
      userId,
      page: pagination.page!,
      pageSize: pagination.pageSize!,
      type,
      scope: effectiveScope,
      subject,
      status,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  getDetail(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.orderService.getDetail(id, userId, role === 'admin');
  }

  @Get(':id/download')
  getDownloadUrl(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orderService.getDownloadUrl(id, userId);
  }
}
