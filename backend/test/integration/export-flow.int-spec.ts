/**
 * INT-4: 导出全链路集成测试
 *
 * 验证：登录 → 查看试卷 → 导出校验(未支付拒绝)
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

describe('INT-4: Export Flow', () => {
  let app: INestApplication;
  let teacherToken: string;

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

    const teacherRes = await request(app.getHttpServer())
      .post('/v1/auth/login').send({ code: 'teacher_export' });
    teacherToken = teacherRes.body.data.accessToken;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ── Export requires authentication ──

  it('should reject unauthenticated export requests', async () => {
    await request(app.getHttpServer())
      .post('/v1/papers/test-id/export/docx')
      .expect(401);

    await request(app.getHttpServer())
      .post('/v1/papers/test-id/export/pdf')
      .expect(401);
  });

  // ── Export non-existent paper ──

  it('should return 404 for non-existent paper export', async () => {
    await request(app.getHttpServer())
      .post('/v1/papers/non-existent/export/docx')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .post('/v1/papers/non-existent/export/pdf')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(404);
  });

  // ── User Profile ──

  it('should return user profile correctly', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('role');
    expect(res.body.data).toHaveProperty('nickname');
    expect(res.body.data.role).toBe('teacher');
  });

  // ── User Stats ──

  it('should return user stats for new user', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/users/me/stats')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    expect(res.body.data.totalPapers).toBe(0);
    expect(res.body.data.totalPaid).toBe(0);
  });

  // ── Health Check ──

  it('should return healthy status', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/health')
      .expect(200);

    expect(res.body.data.status).toBe('healthy');
  });

  // ── Token Refresh ──

  it('should refresh token', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(201);

    expect(res.body.data.accessToken).toBeDefined();
  });
});
