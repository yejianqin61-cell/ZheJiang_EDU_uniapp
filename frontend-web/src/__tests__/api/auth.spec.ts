import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.doMock('@/api/index', () => ({
  default: { get: mockGet, post: mockPost, put: vi.fn(), delete: vi.fn() },
}))

describe('Auth API', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
  })

  it('sendSms -> POST /auth/send-sms', async () => {
    const { sendSms } = await import('@/api/modules/auth')
    mockPost.mockResolvedValue({ message: '验证码已发送' })

    await sendSms('13800138000')

    expect(mockPost).toHaveBeenCalledWith('/auth/send-sms', { phone: '13800138000' })
  })

  it('login -> POST /auth/login', async () => {
    const { login } = await import('@/api/modules/auth')
    mockPost.mockResolvedValue({ accessToken: 'token', role: 'teacher' })

    const response = await login('13800138000', '123456')

    expect(mockPost).toHaveBeenCalledWith('/auth/login', { phone: '13800138000', smsCode: '123456' })
    expect(response.accessToken).toBe('token')
  })

  it('sendEmailCode -> POST /auth/send-email-code', async () => {
    const { sendEmailCode } = await import('@/api/modules/auth')
    mockPost.mockResolvedValue({ message: '验证码已发送' })

    await sendEmailCode('teacher@example.com')

    expect(mockPost).toHaveBeenCalledWith('/auth/send-email-code', { email: 'teacher@example.com' })
  })

  it('registerByEmail -> POST /auth/register', async () => {
    const { registerByEmail } = await import('@/api/modules/auth')
    mockPost.mockResolvedValue({ accessToken: 'token', role: 'teacher', email: 'teacher@example.com' })

    const response = await registerByEmail('teacher@example.com', '123456', 'secret123')

    expect(mockPost).toHaveBeenCalledWith('/auth/register', {
      email: 'teacher@example.com',
      code: '123456',
      password: 'secret123',
    })
    expect(response.email).toBe('teacher@example.com')
  })

  it('loginByPassword -> POST /auth/login-by-password', async () => {
    const { loginByPassword } = await import('@/api/modules/auth')
    mockPost.mockResolvedValue({ accessToken: 'token', role: 'teacher', email: 'teacher@example.com' })

    const response = await loginByPassword('teacher@example.com', 'secret123')

    expect(mockPost).toHaveBeenCalledWith('/auth/login-by-password', {
      email: 'teacher@example.com',
      password: 'secret123',
    })
    expect(response.accessToken).toBe('token')
  })

  it('devLogin -> POST /auth/login with code', async () => {
    const { devLogin } = await import('@/api/modules/auth')
    mockPost.mockResolvedValue({ accessToken: 'token', role: 'admin' })

    await devLogin('admin_test')

    expect(mockPost).toHaveBeenCalledWith('/auth/login', { code: 'admin_test' })
  })

  it('getProfile -> GET /users/me', async () => {
    const { getProfile } = await import('@/api/modules/auth')
    mockGet.mockResolvedValue({ id: '1', role: 'admin' })

    const response = await getProfile()

    expect(mockGet).toHaveBeenCalledWith('/users/me')
    expect(response.role).toBe('admin')
  })

  it('getUserStats -> GET /users/me/stats', async () => {
    const { getUserStats } = await import('@/api/modules/auth')
    mockGet.mockResolvedValue({ orderCount: 3, balance: 100, contributionCount: 2 })

    await getUserStats()

    expect(mockGet).toHaveBeenCalledWith('/users/me/stats')
  })

  it('getMyBalance -> GET /users/me/balance', async () => {
    const { getMyBalance } = await import('@/api/modules/auth')
    mockGet.mockResolvedValue({ balance: 5200 })

    await getMyBalance()

    expect(mockGet).toHaveBeenCalledWith('/users/me/balance')
  })

  it('withdraw -> POST /withdrawals', async () => {
    const { withdraw } = await import('@/api/modules/auth')
    mockPost.mockResolvedValue({ ok: true })

    await withdraw(2000)

    expect(mockPost).toHaveBeenCalledWith('/withdrawals', { amount: 2000 })
  })
})
