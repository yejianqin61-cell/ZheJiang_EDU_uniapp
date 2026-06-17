import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BalanceService } from './services/balance.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get('users/me/balance')
  getBalance(@CurrentUser('id') userId: string) {
    return this.balanceService.getBalance(userId);
  }

  @Get('users/me/balance-log')
  getLog(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
    @Query('type') type?: string,
  ) {
    return this.balanceService.getLog(userId, pagination.page!, pagination.pageSize!, type);
  }
}
