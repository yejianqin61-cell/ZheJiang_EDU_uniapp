/**
 * PERF: 性能基准测试
 *
 * 验证关键 API 端点的响应时间满足验收标准
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import * as request from 'supertest';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PERF: Performance Benchmarks', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DB_PATH = ':memory:';
    mockedAxios.get = jest.fn().mockResolvedValue({ data: {} });
    mockedAxios.post = jest.fn().mockResolvedValue({
      data: { choices: [{ message: { content: JSON.stringify({ title: 't', questions: [] }) } }] },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/v1/auth/login').send({ code: 'teacher_perf' });
    token = res.body.data.accessToken;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  /** 测量请求耗时 */
  async function measure(label: string, fn: () => request.Test, maxMs: number) {
    const start = Date.now();
    await fn().expect((res) => {
      // accept any non-5xx
      expect(res.status).toBeLessThan(500);
    });
    const elapsed = Date.now() - start;
    // Log performance result
    console.log(`  [PERF] ${label}: ${elapsed}ms (limit: ${maxMs}ms) ${elapsed <= maxMs ? '✓' : '✗'}`);
    expect(elapsed).toBeLessThanOrEqual(maxMs);
  }

  // ═══════════════════════════════════════════════════════════
  // Core Endpoint Benchmarks
  // ═══════════════════════════════════════════════════════════

  describe('Health Check', () => {
    it('GET /v1/health should respond within 50ms', async () => {
      await measure('Health Check', () =>
        request(app.getHttpServer()).get('/v1/health'),
        50);
    });
  });

  describe('Config Options', () => {
    it('GET /v1/papers/config-options should respond within 50ms', async () => {
      await measure('Config Options', () =>
        request(app.getHttpServer())
          .get('/v1/papers/config-options')
          .set('Authorization', `Bearer ${token}`),
        50);
    });
  });

  describe('User Profile', () => {
    it('GET /v1/users/me should respond within 50ms', async () => {
      await measure('User Profile', () =>
        request(app.getHttpServer())
          .get('/v1/users/me')
          .set('Authorization', `Bearer ${token}`),
        50);
    });
  });

  describe('User Stats', () => {
    it('GET /v1/users/me/stats should respond within 100ms', async () => {
      await measure('User Stats', () =>
        request(app.getHttpServer())
          .get('/v1/users/me/stats')
          .set('Authorization', `Bearer ${token}`),
        100);
    });
  });

  describe('Admin Dashboard', () => {
    it('GET /v1/admin/questions/stats should respond within 100ms', async () => {
      // Login as admin
      const adminRes = await request(app.getHttpServer())
        .post('/v1/auth/login').send({ code: 'admin_perf' });
      const adminToken = adminRes.body.data.accessToken;

      await measure('Admin Dashboard', () =>
        request(app.getHttpServer())
          .get('/v1/admin/questions/stats')
          .set('Authorization', `Bearer ${adminToken}`),
        100);
    });
  });

  describe('Order List', () => {
    it('GET /v1/orders should respond within 50ms', async () => {
      await measure('Order List (empty)', () =>
        request(app.getHttpServer())
          .get('/v1/orders?page=1&pageSize=10')
          .set('Authorization', `Bearer ${token}`),
        50);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Consecutive Request Stability
  // ═══════════════════════════════════════════════════════════

  describe('Consecutive Requests', () => {
    it('should handle 10 consecutive requests without degradation', async () => {
      const times: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await request(app.getHttpServer())
          .get('/v1/papers/config-options')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        times.push(Date.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      console.log(`  [PERF] 10 consecutive config-options: avg=${avg.toFixed(1)}ms, max=${max}ms`);
      // Average should be reasonable, no catastrophic degradation
      expect(avg).toBeLessThan(100);
    });
  });
});
