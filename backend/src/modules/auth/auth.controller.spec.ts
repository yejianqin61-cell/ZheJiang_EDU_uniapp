/**
 * AuthController 单元测试
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  beforeEach(async () => {
    authService = {
      login: jest.fn().mockResolvedValue({
        accessToken: 'jwt.token',
        user: { id: 'u1', role: 'teacher', nickname: '测试', avatarUrl: null },
      }),
      refresh: jest.fn().mockResolvedValue({ accessToken: 'jwt.new.token' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('POST /auth/login', () => {
    it('should login with code and return token', async () => {
      const result = await controller.login({ code: 'test', nickname: '测试' });
      expect(result.accessToken).toBe('jwt.token');
      expect(result.user.role).toBe('teacher');
    });

    it('should login without nickname', async () => {
      const result = await controller.login({ code: 'test' });
      expect(result.accessToken).toBeDefined();
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token', async () => {
      const result = await controller.refresh('user-1');
      expect(result.accessToken).toBe('jwt.new.token');
      expect(authService.refresh).toHaveBeenCalledWith('user-1');
    });
  });
});
