/**
 * 前端测试工具
 *
 * 提供：
 * 1. Pinia Store 测试包装器
 * 2. API Mock 辅助
 * 3. 组件挂载辅助（Vue Test Utils）
 */
import { createPinia, setActivePinia } from 'pinia';

/**
 * 创建干净的 Pinia 实例用于测试
 * 每个测试用例中调用以重置 Store 状态
 */
export function createTestPinia() {
  const pinia = createPinia();
  setActivePinia(pinia);
  return pinia;
}

/**
 * Mock API 调用 — 模拟 uni.request 的各种响应场景
 */
export function mockApiResponse(response: any) {
  const originalRequest = (globalThis as any).uni.request;
  (globalThis as any).uni.request = (options: any) => {
    if (options.success) {
      options.success({
        statusCode: 200,
        data: response,
      });
    }
    return Promise.resolve({
      statusCode: 200,
      data: response,
    });
  };
  return () => {
    (globalThis as any).uni.request = originalRequest;
  };
}

/**
 * Mock API 调用 — 模拟失败
 */
export function mockApiError(statusCode: number = 500, data: any = {}) {
  const originalRequest = (globalThis as any).uni.request;
  (globalThis as any).uni.request = (options: any) => {
    if (options.fail) {
      options.fail({ errMsg: 'request:fail' });
    }
    return Promise.reject({ errMsg: 'request:fail' });
  };
  return () => {
    (globalThis as any).uni.request = originalRequest;
  };
}

/**
 * 模拟已登录状态（设置 token 和 user）
 */
export function mockLoggedIn(role: 'teacher' | 'admin' = 'teacher') {
  (globalThis as any).uni.setStorageSync('accessToken', 'mock.jwt.token');
  (globalThis as any).uni.setStorageSync('user', JSON.stringify({
    id: 'user-1',
    role,
    nickname: '测试用户',
    avatarUrl: '',
  }));
}

/**
 * 模拟未登录状态
 */
export function mockLoggedOut() {
  (globalThis as any).uni.removeStorageSync('accessToken');
  (globalThis as any).uni.removeStorageSync('user');
}

/**
 * Vitest vi 的用法示例 — 创建可追踪的 mock 函数
 * (vitest 中直接用 vi.fn())
 */
export { createTestPinia as createPinia };
