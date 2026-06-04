/**
 * Vitest 全局 setup
 *
 * 在运行测试前：
 * 1. Mock uni-app 全局 API
 * 2. Mock 微信 API
 * 3. 设置 localStorage/sessionStorage polyfill
 */

// ── Mock uni-app 全局对象 ──
const mockUni: Record<string, any> = {
  // Storage
  getStorageSync: (key: string) => {
    return mockStorage[key] ?? null;
  },
  setStorageSync: (key: string, value: any) => {
    mockStorage[key] = value;
  },
  removeStorageSync: (key: string) => {
    delete mockStorage[key];
  },
  clearStorageSync: () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  },

  // Request (会被各测试 mock 覆盖)
  request: (options: any) => {
    console.warn('[Mock uni] request called:', options.url);
    return Promise.resolve({});
  },

  // Navigation
  navigateTo: (options: any) => {
    mockNavigations.push({ type: 'navigateTo', ...options });
    if (options.success) options.success();
  },
  redirectTo: (options: any) => {
    mockNavigations.push({ type: 'redirectTo', ...options });
    if (options.success) options.success();
  },
  switchTab: (options: any) => {
    mockNavigations.push({ type: 'switchTab', ...options });
    if (options.success) options.success();
  },
  navigateBack: (options: any) => {
    mockNavigations.push({ type: 'navigateBack', ...options });
    if (options?.success) options.success();
  },

  // UI
  showToast: (options: any) => {
    mockToasts.push(options);
  },
  showLoading: () => {},
  hideLoading: () => {},

  // Login
  login: (options: any) => {
    if (options.success) options.success({ code: 'mock-wx-code' });
  },

  // User info
  getUserInfo: (options: any) => {
    if (options.success) {
      options.success({ userInfo: { nickName: '测试用户', avatarUrl: '' } });
    }
  },

  // File upload (miniapp)
  uploadFile: (options: any) => {
    return Promise.resolve({
      statusCode: 200,
      data: JSON.stringify({ code: 0, message: 'ok', data: { fileId: 'mock-file-id' } }),
    });
  },

  // System info
  getSystemInfoSync: () => ({
    platform: 'devtools',
    version: '8.0.0',
    model: 'iPhone 15',
    pixelRatio: 2,
    windowWidth: 375,
    windowHeight: 667,
  }),
};

// 全局存储（mock uni.storage）
const mockStorage: Record<string, any> = {};

// 导航记录（用于断言页面跳转）
export const mockNavigations: Array<{ type: string; url?: string }> = [];

// Toast 记录（用于断言提示信息）
export const mockToasts: Array<{ title: string; icon?: string }> = [];

// 将 mock 对象挂到 global
(globalThis as any).uni = mockUni;
(globalThis as any).wx = mockUni; // 微信小程序中 wx === uni

// ── 浏览器 Storage polyfill ──
if (!globalThis.localStorage) {
  (globalThis as any).localStorage = {
    _data: {} as Record<string, string>,
    getItem: (key: string) => (globalThis as any).localStorage._data[key] ?? null,
    setItem: (key: string, value: string) => {
      (globalThis as any).localStorage._data[key] = value;
    },
    removeItem: (key: string) => {
      delete (globalThis as any).localStorage._data[key];
    },
    clear: () => {
      (globalThis as any).localStorage._data = {};
    },
  };
}

// ── 每个测试后清理 ──
beforeEach(() => {
  mockNavigations.length = 0;
  mockToasts.length = 0;
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
});

// ── 重置函数（在测试中调用） ──
export function resetMocks() {
  mockNavigations.length = 0;
  mockToasts.length = 0;
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
}

export function getLastNavigation() {
  return mockNavigations[mockNavigations.length - 1];
}

export function getLastToast() {
  return mockToasts[mockToasts.length - 1];
}
