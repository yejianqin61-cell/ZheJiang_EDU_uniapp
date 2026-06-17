import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { AppModule } from '../src/app.module'
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor'
import * as request from 'supertest'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('Auth Flow (Integration)', () => {
  let app: INestApplication

  beforeAll(async () => {
    process.env.DB_PATH = ':memory:'
    mockedAxios.get = jest.fn().mockResolvedValue({ data: {} })
    mockedAxios.post = jest.fn().mockResolvedValue({
      data: { choices: [{ message: { content: JSON.stringify({ title: 't', questions: [] }) } }] },
    })
    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = module.createNestApplication()
    app.setGlobalPrefix('v1')
    app.useGlobalFilters(new HttpExceptionFilter())
    app.useGlobalInterceptors(new ResponseInterceptor())
    await app.init()
  }, 30000)

  afterAll(async () => { await app.close() })

  it('POST /v1/auth/send-sms — Dev模式发送验证码', async () => {
    const res = await request(app.getHttpServer()).post('/v1/auth/send-sms').send({ phone: '13800138000' })
    expect(res.body.code).toBe(0)
  })

  it('POST /v1/auth/send-sms — 无效手机号被拒绝', async () => {
    const res = await request(app.getHttpServer()).post('/v1/auth/send-sms').send({ phone: 'abc' })
    expect(res.body.code).toBe(10010)
  })

  it('POST /v1/auth/login — Dev登录成功', async () => {
    const res = await request(app.getHttpServer()).post('/v1/auth/login').send({ code: 'admin_test' })
    expect(res.body.data.accessToken).toBeDefined()
    expect(res.body.data.user || res.body.data.role).toBeTruthy()
  })

  it('GET /v1/users/me — 带Token访问', async () => {
    const login = await request(app.getHttpServer()).post('/v1/auth/login').send({ code: 'admin_test' })
    const token = login.body.data.accessToken
    const res = await request(app.getHttpServer()).get('/v1/users/me').set('Authorization', `Bearer ${token}`)
    expect(res.body.data.role || res.body.data.id).toBeTruthy()
  })

  it('GET /v1/users/me — 无Token返回401', async () => {
    const res = await request(app.getHttpServer()).get('/v1/users/me')
    expect(res.status).toBe(401)
  })
})
