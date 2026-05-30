import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { OrderService } from './order.service';
import { PaymentService } from '../payment/payment.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

class CreateOrderDto {
  @IsString()
  paperId: string;
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
    @CurrentUser('openid') openid: string,
    @Body() dto: CreateOrderDto,
  ) {
    // Step 1: Create order record
    const order = await this.orderService.create(userId, dto.paperId);

    // Step 2: Create payment → get wxPayParams
    let wxPayParams: Record<string, string> | null = null;
    try {
      const paymentResult = await this.paymentService.createPayment(order.orderId, openid);
      wxPayParams = paymentResult.wxPayParams;
    } catch (err: any) {
      // Payment creation failed, but order record exists.
      // User can retry payment from order list.
      // err code 30003 already thrown; just return order without wxPayParams
    }

    return {
      ...order,
      wxPayParams,
    };
  }

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
    @Query('subject') subject?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    this.orderService.cancelExpiredOrders().catch(() => {});
    return this.orderService.list({
      userId,
      page: pagination.page!,
      pageSize: pagination.pageSize!,
      subject,
      status,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  getDetail(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orderService.getDetail(id, userId);
  }

  @Get(':id/download')
  getDownloadUrl(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orderService.getDownloadUrl(id, userId);
  }
}
