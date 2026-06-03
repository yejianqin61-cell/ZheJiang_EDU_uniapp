import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  testPathIgnorePatterns: ['/node_modules/', '/test/'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: [
    'src/**/*.service.ts',
    'src/**/*.controller.ts',
    'src/common/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts',
    '!src/database/**',
    '!src/config/**',
    '!src/test-utils.ts',
    '!src/modules/export/**',
    '!src/modules/payment/wxpay.client.ts',
    '!src/common/cos.service.ts',
    '!src/common/file-logger.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/entities/',
    '/migrations/',
    '/dto/',
    '\\.module\\.ts$',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

export default config;
