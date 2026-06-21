import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../../database/entities/user.entity';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SmsService } from './services/sms.service';
import { EmailService } from './services/email.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: any;
  let jwtService: any;
  let smsService: any;
  let emailService: any;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((dto) => dto),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn(), // set per-test via userRepo.findOne
      }),
    };
    // Wire createQueryBuilder().getOne() to userRepo.findOne for backward compat
    userRepo.createQueryBuilder().getOne.mockImplementation(() => userRepo.findOne());
    jwtService = { sign: jest.fn().mockReturnValue('jwt.token.here') };
    smsService = { sendCode: jest.fn(), verifyCode: jest.fn() };
    emailService = { sendCode: jest.fn(), verifyCode: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'wx.appId') return '';
              if (key === 'wx.appSecret') return '';
              return null;
            }),
          },
        },
        { provide: SmsService, useValue: smsService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login — dev mode', () => {
    it('should create new user on first login', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.save.mockResolvedValue({ id: 'u1', openid: 'test_user', role: 'teacher', nickname: null, avatarUrl: null });

      const result = await service.loginByWxCode('test_user');

      expect(result.accessToken).toBe('jwt.token.here');
      expect(result.user.role).toBe('teacher');
      expect(result.user.id).toBe('u1');
      expect(userRepo.create).toHaveBeenCalledWith({ openid: 'test_user', role: 'teacher', nickname: null });
    });

    it('should return existing user without creating', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u2', openid: 'test_user', role: 'teacher', nickname: null, avatarUrl: null });

      const result = await service.loginByWxCode('test_user');

      expect(result.user.id).toBe('u2');
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('should auto-assign admin role for admin_test', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.save.mockImplementation((e: any) => Promise.resolve({ ...e, id: 'u3' }));

      const result = await service.loginByWxCode('admin_test');

      expect(result.user.role).toBe('admin');
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'admin' }),
      );
    });

    it('should sync nickname on first login when provided', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.save.mockImplementation((e: any) => Promise.resolve({ ...e, id: 'u4' }));

      await service.loginByWxCode('teacher1', '张老师');

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ nickname: '张老师' }),
      );
    });

    it('should update nickname if missing on subsequent login', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u5', openid: 'old', role: 'teacher', nickname: null, avatarUrl: null });

      await service.loginByWxCode('old', '李老师');

      expect(userRepo.update).toHaveBeenCalledWith('u5', { nickname: '李老师' });
    });
  });

  describe('loginByPhone', () => {
    it('should create a teacher account on first phone login', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.save.mockResolvedValue({ id: 'u-phone-1', phone: '13800138000', role: 'teacher' });

      const result = await service.loginByPhone('13800138000', '123456');

      expect(smsService.verifyCode).toHaveBeenCalledWith('13800138000', '123456');
      expect(userRepo.create).toHaveBeenCalledWith({ phone: '13800138000', phoneVerified: true, role: 'teacher' });
      expect(result).toEqual({
        accessToken: 'jwt.token.here',
        role: 'teacher',
        phone: '13800138000',
      });
    });

    it('should reuse an existing user on phone login', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u-phone-2', phone: '13800138000', role: 'admin' });

      const result = await service.loginByPhone('13800138000', '123456');

      expect(userRepo.save).not.toHaveBeenCalled();
      expect(result.role).toBe('admin');
    });
  });

  describe('email auth', () => {
    it('should send email code for a valid email', async () => {
      await expect(service.sendEmailCode('teacher@example.com')).resolves.toEqual({ message: '验证码已发送' });
      expect(emailService.sendCode).toHaveBeenCalledWith('teacher@example.com');
    });

    it('should reject invalid email when sending code', async () => {
      await expect(service.sendEmailCode('invalid-email')).rejects.toThrow(BadRequestException);
    });

    it('should register a new account by email', async () => {
      emailService.verifyCode.mockReturnValue(true);
      userRepo.findOne.mockResolvedValue(null);
      userRepo.save.mockResolvedValue({ id: 'u-email-1', email: 'teacher@example.com', role: 'teacher' });

      const result = await service.registerByEmail('teacher@example.com', '123456', 'secret123');

      expect(emailService.verifyCode).toHaveBeenCalledWith('teacher@example.com', '123456');
      expect(userRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        email: 'teacher@example.com',
        emailVerified: true,
        role: 'teacher',
      }));
      expect(result).toEqual({
        accessToken: 'jwt.token.here',
        role: 'teacher',
        email: 'teacher@example.com',
      });
    });

    it('should reject registration when email code is invalid', async () => {
      emailService.verifyCode.mockReturnValue(false);

      await expect(service.registerByEmail('teacher@example.com', 'bad', 'secret123')).rejects.toThrow(BadRequestException);
    });

    it('should login by password for a registered user', async () => {
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash('secret123', 1);
      userRepo.findOne.mockResolvedValue({ id: 'u-email-2', email: 'teacher@example.com', role: 'teacher', passwordHash });

      const result = await service.loginByPassword('teacher@example.com', 'secret123');

      expect(result).toEqual({
        accessToken: 'jwt.token.here',
        role: 'teacher',
        email: 'teacher@example.com',
      });
    });

    it('should reject login when password is wrong', async () => {
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash('secret123', 1);
      userRepo.findOne.mockResolvedValue({ id: 'u-email-3', email: 'teacher@example.com', role: 'teacher', passwordHash });

      await expect(service.loginByPassword('teacher@example.com', 'wrong-pass')).rejects.toThrow(BadRequestException);
    });
  });

  describe('login — production mode', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: getRepositoryToken(User), useValue: userRepo },
          { provide: JwtService, useValue: jwtService },
          { provide: ConfigService, useValue: { get: jest.fn((k: string) => k === 'wx.appId' ? 'wx123' : k === 'wx.appSecret' ? 'sec123' : null) } },
          { provide: SmsService, useValue: smsService },
          { provide: EmailService, useValue: emailService },
        ],
      }).compile();

      service = module.get<AuthService>(AuthService);
    });

    it('should exchange code for real openid via WeChat API', async () => {
      mockedAxios.get.mockResolvedValue({ data: { openid: 'real_openid_123' } });
      userRepo.findOne.mockResolvedValue({ id: 'u6', openid: 'real_openid_123', role: 'teacher', nickname: null, avatarUrl: null });

      const result = await service.loginByWxCode('wx_code_abc');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.weixin.qq.com/sns/jscode2session',
        expect.objectContaining({ params: expect.objectContaining({ appid: 'wx123', js_code: 'wx_code_abc' }) }),
      );
      expect(result.user.id).toBe('u6');
      expect(result.accessToken).toBeDefined();
    });

    it('should throw on WeChat API error', async () => {
      mockedAxios.get.mockResolvedValue({ data: { errcode: 40029, errmsg: 'invalid code' } });

      await expect(service.loginByWxCode('bad_code')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should return new token', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1', openid: 'test', role: 'teacher' });

      const result = await service.refresh('u1');

      expect(result.accessToken).toBe('jwt.token.here');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'u1' }),
      );
    });

    it('should throw when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.refresh('bad_id')).rejects.toThrow(UnauthorizedException);
    });
  });
});
