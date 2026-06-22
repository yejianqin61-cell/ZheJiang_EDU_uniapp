import type { AxiosRequestConfig } from 'axios'
import api from '../index'
import type {
  DashboardStats,
  PricingConfig,
  OrderItem,
  Pagination,
  KnowledgePoint,
  QuestionDetail,
  QuestionListItem,
  ReviewDetail,
  ReviewListItem,
} from '@/types'

type AdminOrderScope = 'mine' | 'others'
type AdminOrderType = 'download' | 'print' | 'exercise'

interface AdminOrderListParams {
  page?: number
  pageSize?: number
  scope?: AdminOrderScope
  type?: AdminOrderType
  subject?: string
  status?: string
  startDate?: string
  endDate?: string
}

interface AdminOrderListResponse {
  list: OrderItem[]
  pagination: Pagination
}

interface AdminQuestionListParams {
  page?: number
  pageSize?: number
  subject?: string
  grade?: string
  knowledgePoint?: string
  difficulty?: string
  keyword?: string
}

interface AdminQuestionListResponse {
  list: QuestionListItem[]
  pagination: Pagination
}

interface AdminReviewListParams {
  page?: number
  pageSize?: number
}

interface AdminReviewListResponse {
  list: ReviewListItem[]
  pagination: Pagination
}

interface AdminKnowledgePointListParams {
  page?: number
  pageSize?: number
  subject?: string
  grade?: string
}

interface AdminKnowledgePointListResponse {
  list: KnowledgePoint[]
  pagination: Pagination
}

// ===== 仪表盘 =====
export function getDashboardStats() { return api.get<DashboardStats>('/admin/questions/stats') }

// ===== 文件上传 =====
export function uploadFile(formData: FormData, config?: AxiosRequestConfig<FormData>) {
  return api.post('/admin/files/upload', formData, {
    ...config,
    headers: {
      'Content-Type': 'multipart/form-data',
      ...config?.headers,
    },
  })
}

// ===== 审核 =====
export function getReviewList(params: AdminReviewListParams) {
  return api.get<AdminReviewListResponse>('/admin/reviews', { params })
}
export function getReviewDetail(id: string) {
  return api.get<ReviewDetail>(`/admin/reviews/${id}`)
}
export function approveQuestion(id: string) { return api.post(`/admin/reviews/${id}/approve`) }
export function rejectQuestion(id: string) { return api.post(`/admin/reviews/${id}/reject`) }
export function batchReview(ids: string[], action: 'approve' | 'reject') { return api.post('/admin/reviews/batch', { questionIds: ids, action }) }

// ===== 题库管理 =====
export function getQuestions(params: AdminQuestionListParams) { return api.get<AdminQuestionListResponse>('/admin/questions', { params }) }
export function getQuestion(id: string) { return api.get<QuestionDetail>(`/admin/questions/${id}`) }
export function deleteQuestion(id: string) { return api.delete(`/admin/questions/${id}`) }
export function batchDeleteQuestions(ids: string[]) { return api.post('/admin/questions/batch-delete', { questionIds: ids }) }

// ===== 知识点中心 =====
export function getKnowledgePoints(params: AdminKnowledgePointListParams) {
  return api.get<AdminKnowledgePointListResponse>('/admin/knowledge-points', { params })
}

// ===== 定价配置 =====
export function getPricing() { return api.get<PricingConfig>('/admin/pricing') }
export function updatePricing(data: PricingConfig) { return api.put('/admin/pricing', data) }

// ===== 公开定价 =====
export function getPublicPricing() { return api.get('/pricing/public') }

// ===== 订单管理 =====
export function getAdminOrders(params: AdminOrderListParams) { return api.get<AdminOrderListResponse>('/orders', { params }) }
export function updatePrintStatus(orderId: string, printStatus: string) { return api.put(`/admin/orders/${orderId}/print-status`, { printStatus }) }

// ===== 提现管理 =====
export function getWithdrawals(params: Record<string, any>) { return api.get('/admin/withdrawals', { params }) }
export function approveWithdrawal(id: string) { return api.put(`/admin/withdrawals/${id}`, { action: 'approve' }) }
export function rejectWithdrawal(id: string, reason: string) { return api.put(`/admin/withdrawals/${id}`, { action: 'reject', rejectReason: reason }) }

// ===== 贡献题 =====
export function getContributions() { return api.get('/contributions') }
export function getContribution(fileId: string) { return api.get(`/contributions/${fileId}`) }
export function submitContribution(fileId: string) { return api.post(`/contributions/${fileId}/submit`) }

// ===== 收货地址 =====
export function getAddresses() { return api.get('/shipping-addresses') }
export function createAddress(data: any) { return api.post('/shipping-addresses', data) }
export function updateAddress(id: string, data: any) { return api.put(`/shipping-addresses/${id}`, data) }
export function deleteAddress(id: string) { return api.delete(`/shipping-addresses/${id}`) }
