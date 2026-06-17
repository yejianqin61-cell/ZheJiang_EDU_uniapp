import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ===== 支付宝 =====

  /** 支付宝同步跳转（GET，公开） */
  @Public()
  @Get('payment/alipay/return')
  alipayReturn(@Req() req: any) {
    // 支付宝会带着参数 GET 跳回来，前端页面处理
    return { code: 0, message: 'ok' };
  }

  /** 支付宝异步通知（POST，公开） */
  @Public()
  @Post('payment/alipay/callback')
  async alipayCallback(@Body() body: any) {
    return this.paymentService.handleAlipayCallback(body);
  }

  // ===== 通用 =====

  @Get('orders/:id/payment-status')
  @UseGuards(JwtAuthGuard)
  getPaymentStatus(@Param('id') orderId: string, @CurrentUser('id') userId: string) {
    return this.paymentService.getPaymentStatus(orderId, userId);
  }

  /** 支付宝支付：创建支付并返回 HTML 表单 */
  @Post('orders/:id/alipay')
  @UseGuards(JwtAuthGuard)
  async createAlipayPayment(@Param('id') orderId: string) {
    return this.paymentService.createAlipayPayment(orderId);
  }

  // ===== 微信回调（保留兼容） =====

  @Public()
  @Post('orders/callback')
  async wxCallback(@Req() req: any, @Body() body: any) {
    return this.paymentService.handleWxCallback(req.headers ?? {}, body);
  }

  // ===== Dev =====

  @Post('orders/:id/mock-pay')
  @UseGuards(JwtAuthGuard)
  async mockPay(@Param('id') orderId: string) {
    return this.paymentService.mockPay(orderId);
  }

  @Post('orders/:id/balance-pay')
  @UseGuards(JwtAuthGuard)
  async balancePay(@Param('id') orderId: string, @CurrentUser('id') userId: string) {
    return this.paymentService.payByBalance(orderId, userId);
  }
}
