import api from '../index'

export interface AlipayPaymentResponse {
  paymentId?: string
  payForm: string | null
}

export interface PaymentStatusResponse {
  orderId: string
  status: string
  paidAt?: string | null
}

export function payAlipay(orderId: string): Promise<AlipayPaymentResponse> {
  return api.post(`/orders/${orderId}/alipay`)
}

export function payMock(orderId: string): Promise<void> {
  return api.post(`/orders/${orderId}/mock-pay`)
}

export function checkPayStatus(orderId: string): Promise<PaymentStatusResponse> {
  return api.get(`/orders/${orderId}/payment-status`)
}
