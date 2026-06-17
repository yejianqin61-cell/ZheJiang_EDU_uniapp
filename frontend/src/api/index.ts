import type { ApiResponse, PricingConfig } from '../types';
import { getApiBase } from '../config/env';

// === Base Config ===
const BASE_URL = getApiBase();

function getToken(): string {
  return uni.getStorageSync('accessToken') ?? '';
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: Record<string, any>,
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    uni.request({
      method,
      url: BASE_URL + url,
      data,
      header: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      success: (res) => {
        const body = res.data as ApiResponse<T>;
        if (res.statusCode === 401) {
          uni.removeStorageSync('accessToken');
          uni.reLaunch({ url: '/pages/login/index' });
          return;
        }
        if (!body || typeof body !== 'object') {
          uni.showToast({ title: '服务器响应异常', icon: 'none' });
          reject(new Error('Invalid response'));
          return;
        }
        if (body.code === 0) {
          resolve(body);
        } else {
          const msg = Array.isArray(body.message) ? body.message.join('; ') : (body.message || '请求失败');
          uni.showToast({ title: String(msg).slice(0, 30), icon: 'none' });
          reject(body);
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络请求失败', icon: 'none' });
        reject(err);
      },
    });
  });
}

// === Auth ===
export function login(code: string, nickname?: string) {
  return request<{ accessToken: string; user: any }>('POST', '/auth/login', { code, ...(nickname ? { nickname } : {}) });
}

// === Paper ===
export function getConfigOptions() {
  return request<any>('GET', '/papers/config-options');
}

export function getKnowledgePoints(subject: string, grade: string) {
  return request<any[]>('GET', `/papers/knowledge-points?subject=${subject}&grade=${grade}`);
}

export function generatePaper(dto: any) {
  return request<any>('POST', '/papers/generate', dto);
}

// === Orders (dual-mode) ===
export function createOrder(dto: { paperId: string; type: 'download' | 'print'; copies?: number; shippingAddressId?: string }) {
  return request<any>('POST', '/orders', dto);
}
export { createOrder as createDownloadOrder }; // alias for backward compat

export function getOrders(params: {
  page: number; pageSize: number; type?: string; scope?: string;
  subject?: string; status?: string; startDate?: string; endDate?: string;
}) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return request<any>('GET', `/orders?${qs}`);
}

export function getOrderDetail(orderId: string) {
  return request<any>('GET', `/orders/${orderId}`);
}

export function getPaymentStatus(orderId: string) {
  return request<any>('GET', `/orders/${orderId}/payment-status`);
}

export function getOrderDownload(orderId: string) {
  return request<any>('GET', `/orders/${orderId}/download`);
}

// === Export ===
export function exportDocx(paperId: string) {
  return request<{ downloadUrl: string }>('POST', `/papers/${paperId}/export/docx`);
}

export function exportPdf(paperId: string) {
  return request<{ downloadUrl: string }>('POST', `/papers/${paperId}/export/pdf`);
}

// === User ===
export function getUserProfile() {
  return request<any>('GET', '/users/me');
}

export function getUserStats() {
  return request<any>('GET', '/users/me/stats');
}

// === Pricing (public) ===
export function getPublicPricing() {
  return request<PricingConfig>('GET', '/pricing/public');
}

// === Shipping Addresses ===
export function getShippingAddresses() {
  return request<any[]>('GET', '/shipping-addresses');
}

export function createShippingAddress(data: {
  receiverName: string; phone: string; province: string;
  city: string; district: string; detail: string; isDefault?: boolean;
}) {
  return request<{ id: string }>('POST', '/shipping-addresses', data);
}

export function updateShippingAddress(id: string, data: Record<string, any>) {
  return request<void>('PUT', `/shipping-addresses/${id}`, data);
}

export function deleteShippingAddress(id: string) {
  return request<void>('DELETE', `/shipping-addresses/${id}`);
}

// === Admin ===
export function getDashboardStats() {
  return request<any>('GET', '/admin/questions/stats');
}

export function getAdminPricing() {
  return request<PricingConfig>('GET', '/admin/pricing');
}

export function updateAdminPricing(data: {
  download?: { unitPrice: number };
  print?: Array<{ tier: number; minQuantity: number; maxQuantity: number | null; unitPrice: number }>;
  cashback?: { unitPrice: number };
}) {
  return request<void>('PUT', '/admin/pricing', data as any);
}

export function updatePrintStatus(orderId: string, printStatus: string | null) {
  return request<void>('PUT', `/admin/orders/${orderId}/print-status`, { printStatus: printStatus ?? 'null' });
}

export function uploadFile(fileOrPath: string | File, subject: string, grade: string) {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    if (fileOrPath instanceof File) {
      const formData = new FormData();
      formData.append('file', fileOrPath);
      formData.append('subject', subject);
      formData.append('grade', grade);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', BASE_URL + '/admin/files/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);
      xhr.onload = () => {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { reject(xhr.responseText); }
      };
      xhr.onerror = () => reject(xhr.statusText);
      xhr.send(formData);
      return;
    }
    // #endif
    uni.uploadFile({
      url: BASE_URL + '/admin/files/upload',
      filePath: fileOrPath as string,
      name: 'file',
      formData: { subject, grade },
      header: { 'Authorization': `Bearer ${getToken()}` },
      success: (res) => resolve(JSON.parse(res.data)),
      fail: reject,
    });
  });
}

export function getFileStatus(fileId: string) {
  return request<any>('GET', `/admin/files/${fileId}`);
}

export function getUploadFiles(page: number, pageSize: number, status?: string) {
  let url = `/admin/files?page=${page}&pageSize=${pageSize}`;
  if (status) url += `&status=${status}`;
  return request<any>('GET', url);
}

export function getPendingReviews(page: number, pageSize: number, fileId?: string) {
  let url = `/admin/reviews?page=${page}&pageSize=${pageSize}`;
  if (fileId) url += `&fileId=${fileId}`;
  return request<any>('GET', url);
}

export function batchReview(questionIds: string[], action: 'approve' | 'reject') {
  return request<any>('POST', '/admin/reviews/batch', { questionIds, action });
}

export function getKnowledgePointList(page: number, pageSize: number, subject?: string, grade?: string, keyword?: string) {
  let url = `/admin/knowledge-points?page=${page}&pageSize=${pageSize}`;
  if (subject) url += `&subject=${subject}`;
  if (grade) url += `&grade=${grade}`;
  if (keyword) url += `&keyword=${keyword}`;
  return request<any>('GET', url);
}

export function getAdminQuestions(params: Record<string, any>) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return request<any>('GET', `/admin/questions?${qs}`);
}

export function getQuestionDetail(id: string) {
  return request<any>('GET', `/admin/questions/${id}`);
}

export function deleteQuestion(id: string) {
  return request<any>('DELETE', `/admin/questions/${id}`);
}

export function batchDeleteQuestions(questionIds: string[]) {
  return request<any>('POST', '/admin/questions/batch-delete', { questionIds });
}

export function deleteQuestionsByFile(fileId: string) {
  return request<any>('POST', '/admin/questions/delete-by-file', { fileId });
}

// === Contributions (teacher upload) ===
export function uploadContribution(filePath: string, subject: string, grade: string) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: BASE_URL + '/admin/files/upload',
      filePath,
      name: 'file',
      formData: { subject, grade },
      header: { 'Authorization': `Bearer ${getToken()}` },
      success: (res) => resolve(JSON.parse(res.data)),
      fail: reject,
    });
  });
}

export function getContributions(page: number, pageSize: number) {
  return request<any>('GET', `/contributions?page=${page}&pageSize=${pageSize}`);
}

export function getContributionDetail(fileId: string) {
  return request<any>('GET', `/contributions/${fileId}`);
}

export function submitContribution(fileId: string) {
  return request<any>('POST', `/contributions/${fileId}/submit`);
}

// === Balance ===
export function getMyBalance() {
  return request<any>('GET', '/users/me/balance');
}

export function getBalanceLog(page: number, pageSize: number, type?: string) {
  let url = `/users/me/balance-log?page=${page}&pageSize=${pageSize}`;
  if (type) url += `&type=${type}`;
  return request<any>('GET', url);
}

// === Withdrawal ===
export function createWithdrawal(amount: number) {
  return request<any>('POST', '/withdrawals', { amount });
}

export function getWithdrawals(page: number, pageSize: number) {
  return request<any>('GET', `/withdrawals?page=${page}&pageSize=${pageSize}`);
}

export function getAdminWithdrawals(page: number, pageSize: number, status?: string) {
  let url = `/admin/withdrawals?page=${page}&pageSize=${pageSize}`;
  if (status) url += `&status=${status}`;
  return request<any>('GET', url);
}

export function reviewWithdrawal(id: string, action: 'approve' | 'reject', rejectReason?: string) {
  return request<any>('PUT', `/admin/withdrawals/${id}`, { action, ...(rejectReason ? { rejectReason } : {}) });
}

// === Balance Payment ===
export function payByBalance(orderId: string) {
  return request<any>('POST', `/orders/${orderId}/balance-pay`);
}

// === Admin Export (download print order DOCX) ===
export function adminExportOrder(orderId: string) {
  return request<{ downloadUrl: string }>('GET', `/admin/orders/${orderId}/export`);
}
