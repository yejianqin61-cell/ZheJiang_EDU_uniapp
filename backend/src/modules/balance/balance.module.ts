import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BalanceLog } from '../../database/entities/balance-log.entity';
import { Withdrawal } from '../../database/entities/withdrawal.entity';
import { User } from '../../database/entities/user.entity';
import { BalanceService } from './services/balance.service';
import { WithdrawalService } from './services/withdrawal.service';
import { BalanceController } from './balance.controller';
import { WithdrawalController } from './withdrawal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BalanceLog, Withdrawal, User])],
  controllers: [BalanceController, WithdrawalController],
  providers: [BalanceService, WithdrawalService],
  exports: [BalanceService, WithdrawalService],
})
export class BalanceModule {}
