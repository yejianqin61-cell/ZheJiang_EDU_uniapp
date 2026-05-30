import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('orders')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get(':id/payment-status')
  @UseGuards(JwtAuthGuard)
  getPaymentStatus(@Param('id') orderId: string, @CurrentUser('id') userId: string) {
    return this.paymentService.getPaymentStatus(orderId, userId);
  }

  @Public()
  @Post('callback')
  async callback(@Req() req: any, @Body() body: any) {
    return this.paymentService.handleCallback(req.headers ?? {}, body);
  }

  /**
   * Dev-only: simulate a successful payment for testing.
   * POST /v1/orders/:id/mock-pay
   */
  @Post(':id/mock-pay')
  @UseGuards(JwtAuthGuard)
  async mockPay(@Param('id') orderId: string) {
    return this.paymentService.mockPay(orderId);
  }
}
