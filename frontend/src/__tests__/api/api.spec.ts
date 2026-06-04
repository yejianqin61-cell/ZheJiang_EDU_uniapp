/**
 * API 层单元测试
 *
 * 测试所有 API 函数的请求参数、URL、方法正确性
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the api module's uni calls by mocking the global uni object
const mockRequest = vi.fn();
(globalThis as any).uni.request = mockRequest;
(globalThis as any).uni.getStorageSync = vi.fn().mockReturnValue('test-token');
(globalThis as any).uni.removeStorageSync = vi.fn();
(globalThis as any).uni.reLaunch = vi.fn();
(globalThis as any).uni.showToast = vi.fn();

import * as api from '../../api';

describe('API Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).uni.getStorageSync = vi.fn().mockReturnValue('test-token');
  });

  function mockSuccess(data: any) {
    mockRequest.mockImplementation((options: any) => {
      options.success({ statusCode: 200, data: { code: 0, message: 'ok', data } });
    });
  }

  // ── Auth ──

  describe('login', () => {
    it('should POST to /auth/login with code', async () => {
      mockSuccess({ accessToken: 'jwt', user: { id: 'u1', role: 'teacher' } });
      await api.login('wx_code');
      expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST', url: expect.stringContaining('/auth/login'),
        data: { code: 'wx_code' },
      }));
    });

    it('should include nickname when provided', async () => {
      mockSuccess({ accessToken: 'jwt', user: {} });
      await api.login('code', '张老师');
      expect(mockRequest.mock.calls[0][0].data.nickname).toBe('张老师');
    });
  });

  // ── Paper ──

  describe('getConfigOptions', () => {
    it('should GET /papers/config-options', async () => {
      mockSuccess({ grades: [], subjects: [], difficulties: [] });
      await api.getConfigOptions();
      expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET', url: expect.stringContaining('/papers/config-options'),
      }));
    });
  });

  describe('generatePaper', () => {
    it('should POST generation conditions', async () => {
      mockSuccess({ paperId: 'p1', questions: [] });
      const dto = { subject: '数学', grade: '五年级', difficulty: 'mixed', questionCount: 5 };
      await api.generatePaper(dto);
      expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST', url: expect.stringContaining('/papers/generate'), data: dto,
      }));
    });
  });

  // ── Orders ──

  describe('createOrder', () => {
    it('should POST with paperId', async () => {
      mockSuccess({ orderId: 'o1', amount: 500 });
      await api.createOrder('paper-1');
      expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST', url: expect.stringContaining('/orders'),
        data: { paperId: 'paper-1' },
      }));
    });
  });

  describe('getOrders', () => {
    it('should GET with pagination params', async () => {
      mockSuccess({ list: [], pagination: { total: 0 } });
      await api.getOrders(1, 10);
      expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET', url: expect.stringContaining('page=1&pageSize=10'),
      }));
    });
  });

  // ── Export ──

  describe('exportDocx', () => {
    it('should POST to export docx endpoint', async () => {
      mockSuccess({ downloadUrl: '/dl/f.docx' });
      await api.exportDocx('paper-1');
      expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST', url: expect.stringContaining('/papers/paper-1/export/docx'),
      }));
    });
  });

  // ── User ──

  describe('getUserProfile', () => {
    it('should GET /users/me', async () => {
      mockSuccess({ id: 'u1', role: 'teacher' });
      await api.getUserProfile();
      expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET', url: expect.stringContaining('/users/me'),
      }));
    });
  });

  // ── Admin ──

  describe('getDashboardStats', () => {
    it('should GET admin stats', async () => {
      mockSuccess({ totalQuestions: 25 });
      await api.getDashboardStats();
      expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET', url: expect.stringContaining('/admin/questions/stats'),
      }));
    });
  });

  describe('batchReview', () => {
    it('should POST batch review action', async () => {
      mockSuccess({ approved: 3 });
      await api.batchReview(['q1', 'q2', 'q3'], 'approve');
      expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
        method: 'POST', url: expect.stringContaining('/admin/reviews/batch'),
        data: { questionIds: ['q1', 'q2', 'q3'], action: 'approve' },
      }));
    });
  });

  // ── Error Handling ──

  describe('error handling', () => {
    it('should reject when response code !== 0', async () => {
      mockRequest.mockImplementation((options: any) => {
        options.success({ statusCode: 200, data: { code: 20002, message: '题库不足' } });
      });
      await expect(api.generatePaper({ subject: '数学', grade: '五年级', difficulty: 'mixed', questionCount: 50 }))
        .rejects.toEqual(expect.objectContaining({ code: 20002 }));
      expect((globalThis as any).uni.showToast).toHaveBeenCalled();
    });

    it('should handle request failure', async () => {
      mockRequest.mockImplementation((options: any) => {
        options.fail({ errMsg: 'request:fail' });
      });
      await expect(api.getConfigOptions()).rejects.toEqual({ errMsg: 'request:fail' });
    });
  });
});
