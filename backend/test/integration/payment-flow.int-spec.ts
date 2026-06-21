/**
 * INT-2: 支付全链路集成测试
 *
 * 验证：下单 → 支付状态 → mock支付 → 回调处理
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

describe('INT-2: Payment Flow', () => {
  let app: INestApplication;
  let teacherToken: string;
  let adminToken: string;
  let paperId: string;
  let orderId: string;

  beforeAll(async () => {
    process.env.DB_PATH = ':memory:';
    mockedAxios.get = jest.fn().mockResolvedValue({ data: {} });
    mockedAxios.post = jest.fn().mockResolvedValue({
      data: {
        choices: [{ message: { content: JSON.stringify({
          title: '测试卷', questions: [],
        }) } }],
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

    const teacherRes = await request(app.getHttpServer())
      .post('/v1/auth/login').send({ code: 'teacher_pay' });
    teacherToken = teacherRes.body.data.accessToken;

    const adminRes = await request(app.getHttpServer())
      .post('/v1/auth/login').send({ code: 'admin_test' });
    adminToken = adminRes.body.data.accessToken;

    await request(app.getHttpServer())
      .post('/v1/admin/seed')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ── Order Creation ──

  it('should reject order creation with invalid paperId', async () => {
    await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ paperId: 'non-existent-paper-id', type: 'download' })
      .expect(404);
  });

  // ── Empty Order List ──

  it('should return empty order list for new user', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/orders?page=1&pageSize=10')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    expect(res.body.data.pagination.total).toBe(0);
    expect(res.body.data.list).toHaveLength(0);
  });

  // ── Payment Status ──

  it('should return 404 for non-existent order payment status', async () => {
    await request(app.getHttpServer())
      .get('/v1/orders/non-existent/payment-status')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(404);
  });

  // ── Mock Pay ──

  it('should reject mock-pay for non-existent order', async () => {
    await request(app.getHttpServer())
      .post('/v1/orders/non-existent/mock-pay')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(404);
  });

  // ── Auth ──

  it('should reject unauthenticated access to orders', async () => {
    await request(app.getHttpServer()).get('/v1/orders').expect(401);
    await request(app.getHttpServer())
      .post('/v1/orders').send({ paperId: 'test', type: 'download' }).expect(401);
  });

  it('should create a download order and return pending payment status', async () => {
    const paperRes = await request(app.getHttpServer())
      .post('/v1/papers/generate')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ subject: '数学', grade: '五年级', difficulty: 'mixed', questionCount: 5 })
      .expect(201);
    paperId = paperRes.body.data.paperId;

    const orderRes = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ paperId, type: 'download' })
      .expect(201);

    orderId = orderRes.body.data.orderId;
    expect(orderRes.body.data.orderId).toBeDefined();
    expect(orderRes.body.data.payment === null || orderRes.body.data.payment?.provider === 'alipay').toBe(true);

    const statusRes = await request(app.getHttpServer())
      .get(`/v1/orders/${orderId}/payment-status`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    expect(statusRes.body.data.orderId).toBe(orderId);
    expect(statusRes.body.data.status).toBe('pending');
  });

  it('should complete mock payment and persist paid status on order detail', async () => {
    const mockRes = await request(app.getHttpServer())
      .post(`/v1/orders/${orderId}/mock-pay`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(201);

    expect(mockRes.body.data.code).toBe('SUCCESS');

    const detailRes = await request(app.getHttpServer())
      .get(`/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    expect(detailRes.body.data.orderId).toBe(orderId);
    expect(detailRes.body.data.status).toBe('paid');
  });

  // ── Payment Callback (dev mode) ──

  it('should accept payment callback (public, dev mode)', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/orders/callback')
      .send({
        resource: {
          ciphertext: JSON.stringify({ trade_state: 'SUCCESS', out_trade_no: 'test' }),
          associated_data: '',
          nonce: 'nonce123456',
        },
      })
      .expect(201);

    expect(res.body.code).toBeDefined();
  });
});
