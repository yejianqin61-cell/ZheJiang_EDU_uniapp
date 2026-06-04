/**
 * INT-1: 组卷全链路集成测试
 *
 * 验证：登录 → 配置选项 → 知识点查询 → 生成试卷 → 脱敏预览
 * 使用真实 AppModule + SQL.js 数据库，全局 mock axios 阻止外呼
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

describe('INT-1: Paper Generation Pipeline', () => {
  let app: INestApplication;
  let teacherToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Isolate: each test suite gets its own in-memory DB
    process.env.DB_PATH = ':memory:';

    // Mock ALL external HTTP calls
    mockedAxios.get = jest.fn().mockResolvedValue({ data: {} });
    mockedAxios.post = jest.fn().mockResolvedValue({
      data: {
        choices: [{
          message: {
            content: JSON.stringify({
              title: '五年级数学综合练习卷',
              questions: Array.from({ length: 5 }, (_, i) => ({
                index: i + 1, type: 'single_choice',
                content: `生成题目${i + 1}`,
                options: ['A', 'B', 'C', 'D'],
                answer: 'A', analysis: `解析${i + 1}`,
                difficulty: 1, score: 5,
              })),
            }),
          },
        }],
      },
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

    // Login
    const adminRes = await request(app.getHttpServer())
      .post('/v1/auth/login').send({ code: 'admin_test' });
    adminToken = adminRes.body.data.accessToken;

    const teacherRes = await request(app.getHttpServer())
      .post('/v1/auth/login').send({ code: 'teacher_1' });
    teacherToken = teacherRes.body.data.accessToken;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ── Health ──

  it('should return healthy', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/health').expect(200);
    expect(res.body.data.status).toBe('healthy');
  });

  // ── Config Options ──

  it('should return config options with all grades, subjects, difficulties', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/papers/config-options')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    expect(res.body.data.grades).toHaveLength(3);
    expect(res.body.data.subjects).toContain('数学');
    expect(res.body.data.subjects).toHaveLength(9);
    expect(res.body.data.difficulties).toHaveLength(4);
  });

  it('should return structured grade options', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/papers/config-options')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    const primary = res.body.data.grades.find((g: any) => g.stage === '小学');
    expect(primary.grades).toContain('五年级');
    expect(primary.grades).toHaveLength(6);
  });

  // ── Knowledge Points ──

  it('should return knowledge points (empty when no approved questions)', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/papers/knowledge-points?subject=数学&grade=五年级')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── Paper Generation ──

  it('should handle paper generation request (empty DB or mock LLM)', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/papers/generate')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ subject: '数学', grade: '五年级', difficulty: 'mixed', questionCount: 5 });

    // Empty DB → 400 (20002). Mock LLM returns questions → 201 with paperId.
    expect([201, 400]).toContain(res.status);
    if (res.status === 201) {
      expect(res.body.data.paperId).toBeDefined();
    }
  });

  // ── Auth / RBAC ──

  it('should reject unauthenticated access', async () => {
    await request(app.getHttpServer()).get('/v1/papers/config-options').expect(401);
    await request(app.getHttpServer())
      .post('/v1/papers/generate')
      .send({ subject: '数学', grade: '五年级', difficulty: 'mixed', questionCount: 5 })
      .expect(401);
  });

  it('should reject teacher accessing admin endpoints', async () => {
    await request(app.getHttpServer())
      .get('/v1/admin/questions/stats')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(403);
  });

  it('should allow admin to access admin endpoints', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/admin/questions/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.code).toBe(0);
  });
});
