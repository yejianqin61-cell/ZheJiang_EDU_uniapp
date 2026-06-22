import api from '../index'

export function payAlipay(orderId: string): Promise<any> {
  return api.post(`/orders/${orderId}/alipay`)
}

export function payMock(orderId: string): Promise<void> {
  return api.post(`/orders/${orderId}/mock-pay`)
}

export function checkPayStatus(orderId: string): Promise<{ paid: boolean }> {
  return api.get(`/orders/${orderId}/payment-status`)
}
