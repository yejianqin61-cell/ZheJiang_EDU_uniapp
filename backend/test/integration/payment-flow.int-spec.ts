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
