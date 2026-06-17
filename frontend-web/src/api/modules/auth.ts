import api from '../index'

export interface LoginResponse { accessToken: string; role: 'teacher' | 'admin'; phone?: string }

/** 发送短信验证码 */
export function sendSms(phone: string): Promise<void> { return api.post('/auth/send-sms', { phone }) }

/** 短信验证码登录 */
export function login(phone: string, smsCode: string): Promise<LoginResponse> { return api.post('/auth/login', { phone, smsCode }) }

/** Dev 快捷登录（微信兼容接口） */
export function devLogin(code: string): Promise<LoginResponse> { return api.post('/auth/login', { code }) }

/** 获取当前用户信息 */
export function getProfile(): Promise<{ id: string; phone?: string; role: string; createdAt: string }> { return api.get('/users/me') }

/** 获取用户统计 */
export function getUserStats(): Promise<any> { return api.get('/users/me/stats') }

/** 获取用户余额 */
export function getMyBalance(): Promise<{ balance: number }> { return api.get('/users/me/balance') }

/** 余额支付 */
export function payByBalance(orderId: string): Promise<void> { return api.post(`/orders/${orderId}/balance-pay`) }

/** 获取余额日志 */
export function getBalanceLog(): Promise<any> { return api.get('/users/me/balance-log') }

/** 提现 */
export function withdraw(amount: number): Promise<void> { return api.post('/withdrawals', { amount }) }
