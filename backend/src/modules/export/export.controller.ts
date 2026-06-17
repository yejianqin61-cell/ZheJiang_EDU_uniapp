import { Controller, Post, Get, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Order } from '../../database/entities/order.entity';

@Controller()
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  @Post('papers/:id/export/docx')
  exportDocx(@Param('id') paperId: string, @CurrentUser('id') userId: string) {
    return this.exportService.exportDocx(paperId, userId);
  }

  @Post('papers/:id/export/pdf')
  exportPdf(@Param('id') paperId: string, @CurrentUser('id') userId: string) {
    return this.exportService.exportPdf(paperId, userId);
  }

  // === Admin export (download print order DOCX) ===

  @Get('admin/orders/:id/export')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async adminExportOrder(@Param('id') orderId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException({ code: 50001, message: '订单不存在' });
    return this.exportService.exportForAdmin(order.paperId);
  }
}
