import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const authApiMocks = vi.hoisted(() => ({
  sendSms: vi.fn(),
  login: vi.fn(),
  devLogin: vi.fn(),
  getProfile: vi.fn(),
}))

vi.mock('@/api/modules/auth', () => ({
  sendSms: authApiMocks.sendSms,
  login: authApiMocks.login,
  devLogin: authApiMocks.devLogin,
  getProfile: authApiMocks.getProfile,
}))

describe('AuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    authApiMocks.sendSms.mockReset()
    authApiMocks.login.mockReset()
    authApiMocks.devLogin.mockReset()
    authApiMocks.getProfile.mockReset()
  })

  it('initial state is logged out', () => {
    const auth = useAuthStore()
    expect(auth.isLoggedIn).toBe(false)
    expect(auth.isAdmin).toBe(false)
  })

  it('restores token and user from localStorage payload', () => {
    localStorage.setItem('accessToken', 'header.eyJwaG9uZSI6IjEzODAwMTM4MDAwIiwicm9sZSI6ImFkbWluIn0.signature')

    const auth = useAuthStore()

    expect(auth.token).toBe('header.eyJwaG9uZSI6IjEzODAwMTM4MDAwIiwicm9sZSI6ImFkbWluIn0.signature')
    expect(auth.user).toEqual({ phone: '13800138000', role: 'admin' })
    expect(auth.isAdmin).toBe(true)
  })

  it('devLogin stores token and role from nested user payload', async () => {
    const auth = useAuthStore()
    authApiMocks.devLogin.mockResolvedValue({
      accessToken: 'token-dev',
      user: { id: 'user-1', role: 'teacher', nickname: 'Dev Teacher', avatarUrl: null },
    })

    const response = await auth.devLogin('teacher_test')

    expect(authApiMocks.devLogin).toHaveBeenCalledWith('teacher_test')
    expect(response.user.role).toBe('teacher')
    expect(auth.token).toBe('token-dev')
    expect(localStorage.getItem('accessToken')).toBe('token-dev')
    expect(auth.user).toEqual({ phone: undefined, role: 'teacher' })
  })

  it('fetchProfile hydrates current user from profile api', async () => {
    const auth = useAuthStore()
    authApiMocks.getProfile.mockResolvedValue({
      id: 'user-1',
      role: 'teacher',
      nickname: '张老师',
      avatarUrl: null,
      phone: '138****8000',
    })

    await auth.fetchProfile()

    expect(auth.user).toEqual({ phone: '138****8000', role: 'teacher' })
  })

  it('fetchProfile falls back to parsed token when profile request fails', async () => {
    localStorage.setItem('accessToken', 'header.eyJwaG9uZSI6IjEzODAwMTM4MDAwIiwicm9sZSI6InRlYWNoZXIifQ.signature')
    const auth = useAuthStore()
    auth.user = null
    authApiMocks.getProfile.mockRejectedValue(new Error('network'))

    await auth.fetchProfile()

    expect(auth.user).toEqual({ phone: '13800138000', role: 'teacher' })
  })

  it('clears invalid stored token during initialization', () => {
    localStorage.setItem('accessToken', 'invalid-token')
    const auth = useAuthStore()

    expect(auth.token).toBe('')
    expect(auth.user).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
  })

  it('logout clears token from storage', () => {
    const auth = useAuthStore()
    localStorage.setItem('accessToken', 'test-token')
    const hrefSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({ href: '' } as any)

    auth.logout()

    expect(localStorage.getItem('accessToken')).toBeNull()
    hrefSpy.mockRestore()
  })
})
