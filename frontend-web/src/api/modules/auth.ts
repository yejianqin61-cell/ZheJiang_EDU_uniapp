import api from '../index'

export interface LoginResponse {
  accessToken: string
  role: 'teacher' | 'admin'
  phone?: string
  email?: string
}

export interface AuthUserSummary {
  id?: string
  role: 'teacher' | 'admin'
  nickname?: string | null
  avatarUrl?: string | null
}

export interface CodeLoginResponse extends LoginResponse {
  user: AuthUserSummary
}

export interface UserProfile {
  id: string
  phone?: string | null
  role: 'teacher' | 'admin'
  nickname?: string | null
  avatarUrl?: string | null
}

export interface UserStats {
  totalPapers: number
  totalPaid: number
  todayRegenerates?: number
}

export interface BalanceSummary {
  balance: number
}

export function sendSms(phone: string): Promise<void> {
  return api.post('/auth/send-sms', { phone })
}

export function sendEmailCode(email: string): Promise<void> {
  return api.post('/auth/send-email-code', { email })
}

export function login(phone: string, smsCode: string): Promise<LoginResponse> {
  return api.post('/auth/login', { phone, smsCode })
}

export function registerByEmail(email: string, code: string, password: string): Promise<LoginResponse> {
  return api.post('/auth/register', { email, code, password })
}

export function loginByPassword(email: string, password: string): Promise<LoginResponse> {
  return api.post('/auth/login-by-password', { email, password })
}

export function devLogin(code: string): Promise<CodeLoginResponse> {
  return api.post('/auth/login', { code })
}

export function getProfile(): Promise<UserProfile> {
  return api.get('/users/me')
}

export function getUserStats(): Promise<UserStats> {
  return api.get('/users/me/stats')
}

export function getMyBalance(): Promise<BalanceSummary> {
  return api.get('/users/me/balance')
}

export function payByBalance(orderId: string): Promise<void> {
  return api.post(`/orders/${orderId}/balance-pay`)
}

export function getBalanceLog(): Promise<any> {
  return api.get('/users/me/balance-log')
}

export function withdraw(amount: number): Promise<void> {
  return api.post('/withdrawals', { amount })
}
