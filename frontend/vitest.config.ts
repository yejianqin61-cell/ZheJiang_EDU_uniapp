import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    // 测试环境：jsdom 模拟浏览器 DOM
    environment: 'jsdom',

    // 全局变量 (describe, it, expect 等无需导入)
    globals: true,

    // 测试文件匹配
    include: ['src/__tests__/**/*.spec.ts', 'src/__tests__/**/*.spec.tsx'],

    // 排除
    exclude: ['node_modules', 'dist'],

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      include: [
        'src/api/**/*.ts',
        'src/stores/**/*.ts',
        'src/pages/**/*.vue',
      ],
      exclude: [
        'src/__tests__/**',
        'src/types/**',
      ],
      thresholds: {
        lines: 50,
        branches: 40,
        functions: 50,
        statements: 50,
      },
    },

    // setup 文件
    setupFiles: ['src/__tests__/utils/setup.ts'],
  },
});
