import api from '../index'

// ===== 仪表盘 =====
export function getDashboardStats() { return api.get('/admin/questions/stats') }

// ===== 文件上传 =====
export function uploadFile(formData: FormData) { return api.post('/admin/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }) }

// ===== 审核 =====
export function getReviewList(params: { page?: number; pageSize?: number }) { return api.get('/admin/reviews', { params }) }
export function approveQuestion(id: string) { return api.post(`/admin/reviews/${id}/approve`) }
export function rejectQuestion(id: string) { return api.post(`/admin/reviews/${id}/reject`) }
export function batchReview(ids: string[], action: 'approve' | 'reject') { return api.post('/admin/reviews/batch', { questionIds: ids, action }) }

// ===== 题库管理 =====
export function getQuestions(params: Record<string, any>) { return api.get('/admin/questions', { params }) }
export function getQuestion(id: string) { return api.get(`/admin/questions/${id}`) }
export function deleteQuestion(id: string) { return api.delete(`/admin/questions/${id}`) }
export function batchDeleteQuestions(ids: string[]) { return api.post('/admin/questions/batch-delete', { ids }) }

// ===== 知识点中心 =====
export function getKnowledgePoints(params: Record<string, any>) { return api.get('/admin/knowledge-points', { params }) }

// ===== 定价配置 =====
export function getPricing() { return api.get('/admin/pricing') }
export function updatePricing(data: any) { return api.put('/admin/pricing', data) }

// ===== 公开定价 =====
export function getPublicPricing() { return api.get('/pricing/public') }

// ===== 订单管理 =====
export function getAdminOrders(params: Record<string, any>) { return api.get('/orders', { params: { ...params, scope: 'others' } }) }
export function updatePrintStatus(orderId: string, printStatus: string) { return api.put(`/admin/orders/${orderId}/print-status`, { printStatus }) }

// ===== 提现管理 =====
export function getWithdrawals(params: Record<string, any>) { return api.get('/admin/withdrawals', { params }) }
export function approveWithdrawal(id: string) { return api.put(`/admin/withdrawals/${id}`, { action: 'approve' }) }
export function rejectWithdrawal(id: string, reason: string) { return api.put(`/admin/withdrawals/${id}`, { action: 'reject', reason }) }

// ===== 贡献题 =====
export function getContributions() { return api.get('/contributions') }
export function getContribution(fileId: string) { return api.get(`/contributions/${fileId}`) }
export function submitContribution(fileId: string) { return api.post(`/contributions/${fileId}/submit`) }

// ===== 收货地址 =====
export function getAddresses() { return api.get('/shipping-addresses') }
export function createAddress(data: any) { return api.post('/shipping-addresses', data) }
export function updateAddress(id: string, data: any) { return api.put(`/shipping-addresses/${id}`, data) }
export function deleteAddress(id: string) { return api.delete(`/shipping-addresses/${id}`) }
