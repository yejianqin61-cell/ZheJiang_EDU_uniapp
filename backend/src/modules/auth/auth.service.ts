import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import axios from 'axios';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(code: string, nickname?: string) {
    const openid = await this.codeToOpenid(code);

    let user = await this.userRepo.createQueryBuilder('u')
      .where('u.openid = :openid', { openid })
      .getOne();
    if (!user) {
      // Dev: admin_test code → auto admin role
      const role = openid === 'admin_test' ? 'admin' : 'teacher';
      user = await this.userRepo.save(
        this.userRepo.create({ openid, role, nickname: nickname ?? null }),
      );
    } else if (nickname && !user.nickname) {
      // Sync nickname on first login where we have it
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

  async refresh(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({ code: 10003, message: '用户不存在' });
    }
    const token = this.jwtService.sign({ sub: user.id, openid: user.openid, role: user.role });
    return { accessToken: token };
  }

  private async codeToOpenid(code: string): Promise<string> {
    const appId = this.config.get<string>('wx.appId');
    const appSecret = this.config.get<string>('wx.appSecret');

    // Development bypass: if no WeChat credentials configured, accept any code as openid
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
