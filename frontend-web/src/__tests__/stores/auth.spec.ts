import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

describe('AuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('初始状态：未登录', () => {
    const auth = useAuthStore()
    expect(auth.isLoggedIn).toBe(false)
    expect(auth.isAdmin).toBe(false)
  })

  it('Token 为空时 isLoggedIn 为 false', () => {
    const auth = useAuthStore()
    auth.token = ''
    expect(auth.isLoggedIn).toBe(false)
  })

  it('从 localStorage 恢复 Token', () => {
    localStorage.setItem('accessToken', 'header.eyJwaG9uZSI6IjEzODAwMTM4MDAwIiwicm9sZSI6ImFkbWluIn0.signature')
    const auth = useAuthStore()
    // Token 存在，但 parseToken 会尝试解析
    expect(auth.token).toBe('header.eyJwaG9uZSI6IjEzODAwMTM4MDAwIiwicm9sZSI6ImFkbWluIn0.signature')
  })

  it('登出清除 Token', () => {
    const auth = useAuthStore()
    localStorage.setItem('accessToken', 'test-token')
    // Use window.location mock
    const hrefSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({ href: '' } as any)
    auth.logout()
    expect(localStorage.getItem('accessToken')).toBeNull()
    hrefSpy.mockRestore()
  })
})
