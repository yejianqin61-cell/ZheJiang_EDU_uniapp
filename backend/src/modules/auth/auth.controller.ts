import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { AuthService } from './auth.service';
import { SmsService } from './services/sms.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

class SendSmsDto {
  @IsString() @IsNotEmpty()
  phone: string;
}

class LoginDto {
  @IsOptional() @IsString()
  phone?: string;

  @IsOptional() @IsString()
  smsCode?: string;

  @IsOptional() @IsString()
  code?: string;

  @IsOptional() @IsString()
  nickname?: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly smsService: SmsService,
  ) {}

  @Public()
  @Post('send-sms')
  async sendSms(@Body() dto: SendSmsDto) {
    await this.smsService.sendCode(dto.phone);
    return { message: '验证码已发送' };
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    if (dto.phone) {
      if (!dto.smsCode) throw new BadRequestException({ code: 10016, message: '请输入验证码' });
      return this.authService.loginByPhone(dto.phone, dto.smsCode);
    }
    if (dto.code) {
      return this.authService.loginByWxCode(dto.code, dto.nickname);
    }
    throw new BadRequestException({ code: 10017, message: '请使用手机号登录' });
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refresh(@CurrentUser('id') userId: string) {
    return this.authService.refresh(userId);
  }
}
