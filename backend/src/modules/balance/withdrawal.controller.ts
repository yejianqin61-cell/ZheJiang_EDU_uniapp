import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WithdrawalService } from './services/withdrawal.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { IsInt, Min, IsOptional, IsString, IsIn } from 'class-validator';

class CreateWithdrawalDto {
  @IsInt()
  @Min(1000)
  amount: number;
}

class ReviewWithdrawalDto {
  @IsString()
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  rejectReason?: string;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  // ── User endpoints ──

  @Post('withdrawals')
  create(@CurrentUser('id') userId: string, @Body() dto: CreateWithdrawalDto) {
    return this.withdrawalService.create(userId, dto.amount);
  }

  @Get('withdrawals')
  listOwn(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.withdrawalService.listByUser(userId, pagination.page!, pagination.pageSize!);
  }

  // ── Admin endpoints ──

  @Get('admin/withdrawals')
  @UseGuards(RolesGuard)
  @Roles('admin')
  listAll(
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.withdrawalService.listAll(pagination.page!, pagination.pageSize!, status);
  }

  @Put('admin/withdrawals/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  review(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ReviewWithdrawalDto,
  ) {
    return this.withdrawalService.review(id, reviewerId, dto.action, dto.rejectReason);
  }
}
