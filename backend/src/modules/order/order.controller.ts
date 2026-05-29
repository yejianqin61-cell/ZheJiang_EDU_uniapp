import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body('paperId') paperId: string) {
    return this.orderService.create(userId, paperId);
  }

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
    @Query('subject') subject?: string,
    @Query('status') status?: string,
  ) {
    return this.orderService.list(userId, pagination, subject, status);
  }

  @Get(':id/download')
  getDownloadUrl(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orderService.getDownloadUrl(id, userId);
  }
}
