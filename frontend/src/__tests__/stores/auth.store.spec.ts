/**
 * Auth Store 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// Mock API module
vi.mock('../../api', () => ({
  login: vi.fn(),
  getUserProfile: vi.fn(),
}));

import { useAuthStore } from '../../stores/auth';
import { login as apiLogin, getUserProfile } from '../../api';

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    (globalThis as any).uni.getStorageSync = vi.fn().mockReturnValue(null);
    (globalThis as any).uni.setStorageSync = vi.fn();
    (globalThis as any).uni.removeStorageSync = vi.fn();
    (globalThis as any).uni.reLaunch = vi.fn();
    (globalThis as any).uni.login = vi.fn().mockResolvedValue({ code: 'wx-code' });
    (globalThis as any).uni.showToast = vi.fn();
  });

  describe('checkLogin', () => {
    it('should return false when no token in storage', () => {
      const store = useAuthStore();
      expect(store.checkLogin()).toBe(false);
      expect(store.isLoggedIn).toBe(false);
    });

    it('should return true and restore session when token exists', () => {
      (globalThis as any).uni.getStorageSync = vi.fn().mockReturnValue('saved-token');
      vi.mocked(getUserProfile).mockResolvedValue({
        code: 0, message: 'ok', data: { id: 'u1', role: 'teacher', nickname: '测试', avatarUrl: null },
        timestamp: Date.now(),
      } as any);

      const store = useAuthStore();
      expect(store.checkLogin()).toBe(true);
      expect(store.token).toBe('saved-token');
    });
  });

  describe('login', () => {
    it('should set token and user after successful login', async () => {
      vi.mocked(apiLogin).mockResolvedValue({
        code: 0, message: 'ok',
        data: { accessToken: 'jwt-token', user: { id: 'u1', role: 'teacher', nickname: '张老师', avatarUrl: null } },
        timestamp: Date.now(),
      } as any);

      const store = useAuthStore();
      await store.login();

      expect(store.token).toBe('jwt-token');
      expect(store.user?.role).toBe('teacher');
      expect(store.isLoggedIn).toBe(true);
      expect((globalThis as any).uni.setStorageSync).toHaveBeenCalledWith('accessToken', 'jwt-token');
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin user', async () => {
      vi.mocked(apiLogin).mockResolvedValue({
        code: 0, message: 'ok',
        data: { accessToken: 't', user: { id: 'a1', role: 'admin', nickname: '管理员', avatarUrl: null } },
        timestamp: Date.now(),
      } as any);

      const store = useAuthStore();
      await store.login();

      expect(store.isAdmin).toBe(true);
    });

    it('should return false for teacher user', async () => {
      vi.mocked(apiLogin).mockResolvedValue({
        code: 0, message: 'ok',
        data: { accessToken: 't', user: { id: 'u1', role: 'teacher', nickname: '教师', avatarUrl: null } },
        timestamp: Date.now(),
      } as any);

      const store = useAuthStore();
      await store.login();

      expect(store.isAdmin).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear state and redirect to login', async () => {
      vi.mocked(apiLogin).mockResolvedValue({
        code: 0, data: { accessToken: 't', user: { id: 'u1', role: 'teacher', nickname: 'T', avatarUrl: null } },
      } as any);

      const store = useAuthStore();
      await store.login();
      store.logout();

      expect(store.token).toBe('');
      expect(store.user).toBeNull();
      expect(store.isLoggedIn).toBe(false);
      expect((globalThis as any).uni.removeStorageSync).toHaveBeenCalledWith('accessToken');
      expect((globalThis as any).uni.reLaunch).toHaveBeenCalledWith({ url: '/pages/login/index' });
    });
  });
});
