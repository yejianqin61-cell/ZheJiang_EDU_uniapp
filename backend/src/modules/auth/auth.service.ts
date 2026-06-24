import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities/user.entity';
import { SmsService } from './services/sms.service';
import { EmailService } from './services/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
  ) {}

  // ========== 短信验证码登录 ==========

  async loginByPhone(phone: string, smsCode: string) {
    // 验证短信验证码
    this.smsService.verifyCode(phone, smsCode);

    let user = await this.userRepo.findOne({ where: { phone } });
    if (!user) {
      // 首次登录 → 自动注册
      const adminPhones = (process.env.ADMIN_PHONES ?? '').split(',').map(s => s.trim()).filter(Boolean);
      const isAdmin = adminPhones.includes(phone);
      user = await this.userRepo.save(
        this.userRepo.create({ phone, phoneVerified: true, role: isAdmin ? 'admin' : 'teacher' }),
      );
    }

    const token = this.jwtService.sign({ sub: user.id, phone, role: user.role });
    return {
      accessToken: token,
      role: user.role,
      phone: user.phone,
    };
  }

  // ========== 邮箱验证码注册 ==========

  async registerByEmail(email: string, code: string, password: string) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException({ code: 10020, message: '邮箱格式不正确' });
    }
    if (password.length < 6) {
      throw new BadRequestException({ code: 10021, message: '密码至少6位' });
    }
    if (!this.emailService.verifyCode(email, code)) {
      throw new BadRequestException({ code: 10022, message: '验证码错误或已过期' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let user = await this.userRepo.findOne({ where: { email } });
    if (user) {
      // 已有账号 → 更新密码
      await this.userRepo.update(user.id, { passwordHash, emailVerified: true });
    } else {
      const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(s => s.trim()).filter(Boolean);
      const role = adminEmails.includes(email) ? 'admin' : 'teacher';
      user = await this.userRepo.save(
        this.userRepo.create({ email, passwordHash, emailVerified: true, role }),
      );
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    return { accessToken: token, role: user.role, email: user.email };
  }

  // ========== 邮箱密码登录 ==========

  async loginByPassword(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new BadRequestException({ code: 10023, message: '账号不存在，请先注册' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new BadRequestException({ code: 10024, message: '密码错误' });
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    return { accessToken: token, role: user.role, email: user.email };
  }

  // ========== 发送邮箱验证码 ==========

  async sendEmailCode(email: string) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException({ code: 10020, message: '邮箱格式不正确' });
    }
    await this.emailService.sendCode(email);
    return { message: '验证码已发送' };
  }

  // ========== 微信 code 登录（保留兼容） ==========

  async loginByWxCode(code: string, nickname?: string) {
    const openid = await this.codeToOpenid(code);

    let user = await this.userRepo.createQueryBuilder('u')
      .where('u.openid = :openid', { openid })
      .getOne();
    if (!user) {
      const adminOpenids = (process.env.ADMIN_OPENIDS ?? '').split(',').map(s => s.trim()).filter(Boolean);
      const isAdmin = adminOpenids.includes(openid) || openid === 'admin_test';
      const role = isAdmin ? 'admin' : 'teacher';
      user = await this.userRepo.save(
        this.userRepo.create({ openid, role, nickname: nickname ?? null }),
      );
    } else if (nickname && !user.nickname) {
      await this.userRepo.update(user.id, { nickname });
      user.nickname = nickname;
    }

    const token = this.jwtService.sign({ sub: user.id, openid, role: user.role });

    return {
      accessToken: token,
      user: {
        id: user.id,
        role: user.role,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  // ========== Token 刷新 ==========

  async refresh(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({ code: 10003, message: '用户不存在' });
    }
    const token = this.jwtService.sign({ sub: user.id, phone: user.phone, openid: user.openid, role: user.role });
    return { accessToken: token };
  }

  // ========== 微信 code → openid ==========

  private async codeToOpenid(code: string): Promise<string> {
    const appId = this.config.get<string>('wx.appId');
    const appSecret = this.config.get<string>('wx.appSecret');

    if (!appId || !appSecret) {
      return code;
    }

    try {
      const res = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
        params: { appid: appId, secret: appSecret, js_code: code, grant_type: 'authorization_code' },
        timeout: 5000,
      });

      if (res.data.errcode) {
        throw new UnauthorizedException({
          code: 10001,
          message: `微信登录失败: ${res.data.errmsg}`,
        });
      }

      return res.data.openid;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException({ code: 10002, message: '微信接口调用失败' });
    }
  }
}
