import api from '../index'

export interface LoginResponse {
  accessToken: string
  role: 'teacher' | 'admin'
  phone?: string
}

export interface UserProfile {
  id: string
  phone?: string
  role: 'teacher' | 'admin'
  createdAt: string
}

export interface UserStats {
  orderCount: number
  balance: number
  contributionCount: number
}

export interface BalanceSummary {
  balance: number
}

export function sendSms(phone: string): Promise<void> {
  return api.post('/auth/send-sms', { phone })
}

export function login(phone: string, smsCode: string): Promise<LoginResponse> {
  return api.post('/auth/login', { phone, smsCode })
}

export function devLogin(code: string): Promise<LoginResponse> {
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
