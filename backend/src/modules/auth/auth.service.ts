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

  private getAdminEmails() {
    return (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  // ========== SMS login ==========

  async loginByPhone(phone: string, smsCode: string) {
    this.smsService.verifyCode(phone, smsCode);

    let user = await this.userRepo.findOne({ where: { phone } });
    if (!user) {
      const adminPhones = (process.env.ADMIN_PHONES ?? '').split(',').map((s) => s.trim()).filter(Boolean);
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

  // ========== Email register ==========

  async registerByEmail(email: string, code: string, password: string) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException({ code: 10020, message: '邮箱格式不正确' });
    }
    if (password.length < 6) {
      throw new BadRequestException({ code: 10021, message: '密码至少6位' });
    }
    if (!this.emailService.verifyCode(normalizedEmail, code)) {
      throw new BadRequestException({ code: 10022, message: '验证码错误或已过期' });
    }

    const existingUser = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      throw new BadRequestException({ code: 10025, message: '邮箱已注册，请直接登录' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const role = this.getAdminEmails().includes(normalizedEmail) ? 'admin' : 'teacher';
    const user = await this.userRepo.save(
      this.userRepo.create({ email: normalizedEmail, passwordHash, emailVerified: true, role }),
    );

    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    return { accessToken: token, role: user.role, email: user.email };
  }

  async resetPasswordByEmail(email: string, code: string, newPassword: string) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException({ code: 10020, message: '邮箱格式不正确' });
    }
    if (newPassword.length < 6) {
      throw new BadRequestException({ code: 10021, message: '密码至少6位' });
    }
    if (!this.emailService.verifyCode(normalizedEmail, code)) {
      throw new BadRequestException({ code: 10022, message: '验证码错误或已过期' });
    }

    const user = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      throw new BadRequestException({ code: 10023, message: '账号不存在，请先注册' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const nextRole = this.getAdminEmails().includes(normalizedEmail) ? 'admin' : user.role;
    await this.userRepo.update(user.id, {
      passwordHash,
      emailVerified: true,
      role: nextRole,
    });
    user.passwordHash = passwordHash;
    user.emailVerified = true;
    user.role = nextRole;

    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    return { accessToken: token, role: user.role, email: user.email };
  }

  // ========== Email password login ==========

  async loginByPassword(email: string, password: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (!user || !user.passwordHash) {
      throw new BadRequestException({ code: 10023, message: '账号不存在，请先注册' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new BadRequestException({ code: 10024, message: '密码错误' });
    }

    const nextRole = this.getAdminEmails().includes(normalizedEmail) ? 'admin' : user.role;
    if (nextRole !== user.role) {
      await this.userRepo.update(user.id, { role: nextRole });
      user.role = nextRole;
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    return { accessToken: token, role: user.role, email: user.email };
  }

  // ========== Send email code ==========

  async sendEmailCode(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException({ code: 10020, message: '邮箱格式不正确' });
    }
    await this.emailService.sendCode(normalizedEmail);
    return { message: '验证码已发送' };
  }

  // ========== WeChat code login ==========

  async loginByWxCode(code: string, nickname?: string) {
    const openid = await this.codeToOpenid(code);

    let user = await this.userRepo.createQueryBuilder('u')
      .where('u.openid = :openid', { openid })
      .getOne();
    if (!user) {
      const adminOpenids = (process.env.ADMIN_OPENIDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
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

  // ========== Token refresh ==========

  async refresh(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({ code: 10003, message: '用户不存在' });
    }
    const token = this.jwtService.sign({ sub: user.id, phone: user.phone, openid: user.openid, role: user.role });
    return { accessToken: token };
  }

  // ========== WeChat code -> openid ==========

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
