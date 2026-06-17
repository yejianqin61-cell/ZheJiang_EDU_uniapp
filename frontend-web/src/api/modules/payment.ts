import api from '../index'

/** 支付宝支付 */
export function payAlipay(orderId: string): Promise<any> { return api.post(`/orders/${orderId}/alipay`) }

/** 查询支付状态 */
export function checkPayStatus(orderId: string): Promise<{ paid: boolean }> { return api.get(`/orders/${orderId}/payment-status`) }
