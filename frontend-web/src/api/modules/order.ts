import api from '../index'

export interface CreateOrderParams { paperId: string; type: 'download' | 'print'; copies?: number; shippingAddressId?: string }

export function createOrder(params: CreateOrderParams) { return api.post('/orders', params) }
export function getOrders(params: { type?: string; page?: number; pageSize?: number; scope?: string }) { return api.get('/orders', { params }) }
export function getOrder(orderId: string) { return api.get(`/orders/${orderId}`) }
export function getOrderDownload(orderId: string) { return api.get(`/orders/${orderId}/download`) }
