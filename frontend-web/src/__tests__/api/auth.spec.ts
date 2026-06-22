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
    mockPost.mockResolvedValue({ accessToken: 'token', user: { id: 'u1', role: 'admin', nickname: 'Dev Admin', avatarUrl: null } })

    const response = await devLogin('admin_test')

    expect(mockPost).toHaveBeenCalledWith('/auth/login', { code: 'admin_test' })
    expect(response.user.role).toBe('admin')
  })

  it('getProfile -> GET /users/me', async () => {
    const { getProfile } = await import('@/api/modules/auth')
    mockGet.mockResolvedValue({ id: '1', role: 'admin', nickname: '张老师', avatarUrl: null, phone: '138****8000' })

    const response = await getProfile()

    expect(mockGet).toHaveBeenCalledWith('/users/me')
    expect(response.role).toBe('admin')
    expect(response.nickname).toBe('张老师')
  })

  it('getUserStats -> GET /users/me/stats', async () => {
    const { getUserStats } = await import('@/api/modules/auth')
    mockGet.mockResolvedValue({ totalPapers: 3, totalPaid: 2, todayRegenerates: 1 })

    const response = await getUserStats()

    expect(mockGet).toHaveBeenCalledWith('/users/me/stats')
    expect(response.totalPapers).toBe(3)
  })

  it('getMyBalance -> GET /users/me/balance', async () => {
    const { getMyBalance } = await import('@/api/modules/auth')
    mockGet.mockResolvedValue({ balance: 5200, totalEarned: 8000, totalSpent: 2800 })

    const response = await getMyBalance()

    expect(mockGet).toHaveBeenCalledWith('/users/me/balance')
    expect(response.totalEarned).toBe(8000)
  })

  it('getBalanceLog -> GET /users/me/balance-log with params', async () => {
    const { getBalanceLog } = await import('@/api/modules/auth')
    mockGet.mockResolvedValue({
      list: [{ id: 'log-1', amount: 500, type: 'cashback', note: '返现', balanceAfter: 1500, createdAt: '2026-06-22T00:00:00.000Z' }],
      pagination: { page: 2, pageSize: 10, total: 12, totalPages: 2 },
    })

    const response = await getBalanceLog({ page: 2, pageSize: 10, type: 'cashback' })

    expect(mockGet).toHaveBeenCalledWith('/users/me/balance-log', {
      params: { page: 2, pageSize: 10, type: 'cashback' },
    })
    expect(response.pagination.totalPages).toBe(2)
  })

  it('withdraw -> POST /withdrawals', async () => {
    const { withdraw } = await import('@/api/modules/auth')
    mockPost.mockResolvedValue({ ok: true })

    await withdraw(2000)

    expect(mockPost).toHaveBeenCalledWith('/withdrawals', { amount: 2000 })
  })
})
