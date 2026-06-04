/**
 * INT-3: 知识库管道集成测试
 *
 * 验证：上传文件 → 管道处理 → 审核 → 知识点管理
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

describe('INT-3: Knowledge Base Pipeline', () => {
  let app: INestApplication;
  let adminToken: string;
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

  // ── File Upload ──

  it('should upload MD file and receive file status', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/admin/files/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('subject', '数学')
      .field('grade', '五年级')
      .attach('file', Buffer.from('# 题目1\n1+1=?\n\nA.1 B.2 C.3 D.4\n\n答案：B\n\n# 题目2\n2+2=?\n\nA.3 B.4 C.5 D.6\n\n答案：B'), 'test.md')
      .expect(201);

    expect(res.body.data.fileId).toBeDefined();
    expect(res.body.data.status).toBe('processing');
  });

  it('should reject unsupported file format', async () => {
    await request(app.getHttpServer())
      .post('/v1/admin/files/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('subject', '数学')
      .field('grade', '五年级')
      .attach('file', Buffer.from('malware'), 'virus.exe')
      .expect(400);
  });

  // ── File Status ──

  it('should return file status by id', async () => {
    // Upload first
    const uploadRes = await request(app.getHttpServer())
      .post('/v1/admin/files/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('subject', '语文')
      .field('grade', '三年级')
      .attach('file', Buffer.from('# 题1\n这是什么？'), 'chinese.md')
      .expect(201);

    const fileId = uploadRes.body.data.fileId;

    // Check status
    const res = await request(app.getHttpServer())
      .get(`/v1/admin/files/${fileId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.fileId).toBe(fileId);
    expect(res.body.data.filename).toBe('chinese.md');
  });

  // ── Review Queue ──

  it('should return review queue (may be empty)', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/admin/reviews?page=1&pageSize=20')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.pagination).toBeDefined();
    expect(Array.isArray(res.body.data.list)).toBe(true);
  });

  // ── Knowledge Points ──

  it('should list knowledge points', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/admin/knowledge-points?page=1&pageSize=20')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.pagination).toBeDefined();
  });

  // ── RBAC: Teacher cannot access admin endpoints ──

  it('should reject teacher uploading files', async () => {
    await request(app.getHttpServer())
      .post('/v1/admin/files/upload')
      .set('Authorization', `Bearer ${teacherToken}`)
      .field('subject', '数学')
      .field('grade', '五年级')
      .attach('file', Buffer.from('test'), 'test.md')
      .expect(403);
  });

  it('should reject teacher accessing review queue', async () => {
    await request(app.getHttpServer())
      .get('/v1/admin/reviews?page=1&pageSize=20')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(403);
  });
});
