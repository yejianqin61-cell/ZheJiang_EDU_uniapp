import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

class LoginDto {
  @IsString() @IsNotEmpty()
  code: string;

  @IsOptional() @IsString()
  nickname?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.code, dto.nickname);
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refresh(@CurrentUser('id') userId: string) {
    return this.authService.refresh(userId);
  }
}
