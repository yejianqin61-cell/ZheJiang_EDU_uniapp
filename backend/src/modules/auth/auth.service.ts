import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(code: string) {
    const openid = await this.codeToOpenid(code);
    if (!openid) {
      throw new UnauthorizedException({ code: 10001, message: '登录code无效' });
    }

    let user = await this.userRepo.findOne({ where: { openid } });
    if (!user) {
      user = await this.userRepo.save(
        this.userRepo.create({ openid, role: 'teacher' }),
      );
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

  private async codeToOpenid(code: string): Promise<string | null> {
    // TODO: call WeChat API jscode2session
    // const res = await axios.get('https://api.weixin.qq.com/sns/jscode2session', { params: { appid, secret, js_code: code, grant_type: 'authorization_code' } });
    // return res.data.openid ?? null;
    return code; // stub for development
  }
}
