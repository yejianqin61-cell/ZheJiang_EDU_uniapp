/**
 * UserController 单元测试
 */
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  let userService: any;

  beforeEach(async () => {
    userService = {
      getProfile: jest.fn().mockResolvedValue({
        id: 'user-1', role: 'teacher', nickname: '测试', avatarUrl: null,
      }),
      getStats: jest.fn().mockResolvedValue({ totalPapers: 5, totalPaid: 3 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: userService }],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  describe('GET /users/me', () => {
    it('should return current user profile', async () => {
      const result = await controller.getProfile('user-1');
      expect(result.id).toBe('user-1');
      expect(result.role).toBe('teacher');
      expect(userService.getProfile).toHaveBeenCalledWith('user-1');
    });
  });

  describe('GET /users/me/stats', () => {
    it('should return user stats', async () => {
      const result = await controller.getStats('user-1');
      expect(result.totalPapers).toBe(5);
      expect(result.totalPaid).toBe(3);
    });
  });
});
