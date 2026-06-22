import api from '../index'
import type { CreateOrderResult, OrderDetail, OrderItem, Pagination } from '@/types'

export type OrderType = 'download' | 'print' | 'exercise'

export interface CreateOrderParams {
  paperId: string
  type: OrderType
  copies?: number
  shippingAddressId?: string
}

export interface OrderListParams {
  type?: OrderType
  page?: number
  pageSize?: number
  scope?: string
}

export interface OrderListResponse {
  list: OrderItem[]
  pagination: Pagination
}

export function createOrder(params: CreateOrderParams) {
  return api.post<CreateOrderResult>('/orders', params)
}

export function getOrders(params: OrderListParams) {
  return api.get<OrderListResponse>('/orders', { params })
}

export function getOrder(orderId: string) {
  return api.get<OrderDetail>(`/orders/${orderId}`)
}

export function getOrderDownload(orderId: string) {
  return api.get<{ docxUrl?: string; pdfUrl?: string }>(`/orders/${orderId}/download`)
}
