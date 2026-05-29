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
  async callback(@Body() body: any) {
    return this.paymentService.handleCallback(body);
  }
}
