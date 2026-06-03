import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import * as request from 'supertest';

describe('API E2E', () => {
  let app: INestApplication;
  let adminToken: string;
  let teacherToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // === Auth ===
  describe('Auth', () => {
    it('POST /v1/auth/login — admin_test gets admin role', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ code: 'admin_test' })
        .expect(201);

      expect(res.body.code).toBe(0);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe('admin');
      adminToken = res.body.data.accessToken;
    });

    it('POST /v1/auth/login — normal user gets teacher role', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ code: 'normal_user' })
        .expect(201);

      expect(res.body.data.user.role).toBe('teacher');
      teacherToken = res.body.data.accessToken;
    });

    it('POST /v1/auth/refresh — returns new token', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body.data.accessToken).toBeDefined();
    });
  });

  // === Health ===
  describe('Health', () => {
    it('GET /v1/health — returns healthy', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/health')
        .expect(200);

      expect(res.body.data.status).toBe('healthy');
    });
  });

  // === Paper config ===
  describe('Paper Config', () => {
    it('GET /v1/papers/config-options — requires auth', async () => {
      await request(app.getHttpServer())
        .get('/v1/papers/config-options')
        .expect(401);
    });

    it('GET /v1/papers/config-options — returns options', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/papers/config-options')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(res.body.data.grades).toHaveLength(3);
      expect(res.body.data.subjects).toContain('数学');
    });
  });

  // === Paper generation (dev mode → DB direct) ===
  describe('Paper Generation', () => {
    it('POST /v1/papers/generate — fails with empty DB', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/papers/generate')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ subject: '数学', grade: '五年级', difficulty: 'mixed', questionCount: 5 })
        .expect(400);

      expect(res.body.code).toBe(20002);
    });
  });

  // === Unauthorized access ===
  describe('Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/v1/orders')
        .expect(401);
    });

    it('should reject teacher accessing admin endpoints', async () => {
      await request(app.getHttpServer())
        .get('/v1/admin/questions/stats')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403);
    });

    it('should allow admin accessing admin endpoints', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/admin/questions/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.code).toBe(0);
    });
  });

  // === User ===
  describe('User', () => {
    it('GET /v1/users/me — returns user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/users/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.role).toBe('admin');
    });

    it('GET /v1/users/me/stats — returns stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/users/me/stats')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(res.body.data.totalPapers).toBeDefined();
    });
  });

  // === Orders ===
  describe('Orders', () => {
    it('POST /v1/orders — fails with invalid paperId', async () => {
      await request(app.getHttpServer())
        .post('/v1/orders')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ paperId: 'non-existent' })
        .expect(404);
    });

    it('GET /v1/orders — returns empty list', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/orders?page=1&pageSize=10')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(res.body.data.pagination.total).toBe(0);
    });
  });
});
