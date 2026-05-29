import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from '../../database/entities/user.entity';
import { Paper } from '../../database/entities/paper.entity';
import { Order } from '../../database/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Paper, Order])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
