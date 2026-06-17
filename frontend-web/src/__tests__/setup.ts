import { vi } from 'vitest'

// Mock localStorage
const store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
})

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: () => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    }),
  },
}))

// Mock Element Plus
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  ElMessageBox: { confirm: vi.fn(), prompt: vi.fn() },
}))

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useRoute: () => ({ path: '/', query: {}, params: {}, fullPath: '/' }),
  createRouter: vi.fn(),
  createWebHistory: vi.fn(),
}))

// Mock echarts
vi.mock('echarts', () => ({
  default: { init: () => ({ setOption: vi.fn(), dispose: vi.fn(), resize: vi.fn() }) },
  init: () => ({ setOption: vi.fn(), dispose: vi.fn(), resize: vi.fn() }),
}))

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k])
})
