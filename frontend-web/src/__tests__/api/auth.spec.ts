import { describe, it, expect, vi } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()
vi.doMock('@/api/index', () => ({ default: { get: mockGet, post: mockPost, put: vi.fn(), delete: vi.fn() } }))

describe('Auth API', () => {
  it('sendSms 发送 POST /auth/send-sms', async () => {
    const { sendSms } = await import('@/api/modules/auth')
    mockPost.mockResolvedValue({ message: '验证码已发送' })
    await sendSms('13800138000')
    expect(mockPost).toHaveBeenCalledWith('/auth/send-sms', { phone: '13800138000' })
  })

  it('login 发送 POST /auth/login', async () => {
    const { login } = await import('@/api/modules/auth')
    mockPost.mockResolvedValue({ accessToken: 'token', role: 'teacher' })
    const r = await login('13800138000', '123456')
    expect(mockPost).toHaveBeenCalledWith('/auth/login', { phone: '13800138000', smsCode: '123456' })
    expect(r.accessToken).toBe('token')
  })

  it('devLogin 发送 POST /auth/login with code', async () => {
    const { devLogin } = await import('@/api/modules/auth')
    mockPost.mockResolvedValue({ accessToken: 'token', role: 'admin' })
    await devLogin('admin_test')
    expect(mockPost).toHaveBeenCalledWith('/auth/login', { code: 'admin_test' })
  })

  it('getProfile 发送 GET /users/me', async () => {
    const { getProfile } = await import('@/api/modules/auth')
    mockGet.mockResolvedValue({ id: '1', role: 'admin' })
    const r = await getProfile()
    expect(mockGet).toHaveBeenCalledWith('/users/me')
    expect(r.role).toBe('admin')
  })
})
