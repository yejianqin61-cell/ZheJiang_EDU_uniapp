import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SmsService } from './services/sms.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  beforeEach(async () => {
    authService = {
      loginByPhone: jest.fn().mockResolvedValue({ accessToken: 'jwt.token', role: 'teacher', phone: '138****8000' }),
      loginByWxCode: jest.fn().mockResolvedValue({ accessToken: 'jwt.token', user: { id: 'u1', role: 'teacher' } }),
      refresh: jest.fn().mockResolvedValue({ accessToken: 'jwt.new.token' }),
    };
    const smsService = { sendCode: jest.fn(), verifyCode: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: SmsService, useValue: smsService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('POST /auth/send-sms → send verification code', async () => {
    const result = await controller.sendSms({ phone: '13800138000' });
    expect(result.message).toBe('验证码已发送');
  });

  it('POST /auth/login (phone) → login with SMS code', async () => {
    const result = await controller.login({ phone: '13800138000', smsCode: '123456' });
    expect(result.accessToken).toBe('jwt.token');
    expect(authService.loginByPhone).toHaveBeenCalledWith('13800138000', '123456');
  });

  it('POST /auth/login (code) → legacy WeChat login', async () => {
    const result = await controller.login({ code: 'wx_test' });
    expect((result as any).user.id).toBe('u1');
  });
});
