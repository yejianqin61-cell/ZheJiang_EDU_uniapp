import type { Config } from 'jest';

const isCI = process.env.CI === 'true';

const baseConfig: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^pdfjs-dist$': '<rootDir>/src/__mocks__/pdfjs-dist.ts',
    '^pdf-parse$': '<rootDir>/src/__mocks__/pdf-parse.ts',
  },
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  coveragePathIgnorePatterns: ['/node_modules/', '/entities/', '/migrations/', '/dto/', '\\.module\\.ts$'],
  coverageDirectory: './coverage',
};

const config: Config = {
  // Root-level options (not per-project)
  maxWorkers: isCI ? 2 : 1,
  logHeapUsage: true,

  projects: [
    {
      ...baseConfig,
      displayName: 'unit',
      testRegex: 'src/.*\\.spec\\.ts$',
      testPathIgnorePatterns: ['/node_modules/', '/dist/'],
      testTimeout: 15000,
      collectCoverageFrom: [
        'src/**/*.service.ts',
        'src/**/*.controller.ts',
        'src/common/**/*.ts',
        'src/modules/payment/wxpay.client.ts',
        'src/modules/export/**/*.ts',
        '!src/**/*.spec.ts',
        '!src/main.ts',
        '!src/database/**',
        '!src/config/**',
        '!src/test-utils.ts',
        '!src/common/cos.service.ts',
        '!src/common/file-logger.ts',
      ],
      coverageThreshold: {
        global: { branches: 70, functions: 70, lines: 70, statements: 70 },
      },
    },
    {
      ...baseConfig,
      displayName: 'integration',
      testRegex: 'test/.*\\.(int|e2e)-spec\\.ts$',
      testPathIgnorePatterns: ['/node_modules/', '/dist/'],
      testTimeout: 30000,  // 集成测试 30s 超时（启动 AppModule 较慢）
      // 不收集覆盖率
      collectCoverageFrom: [],
    },
  ],
};

export default config;
