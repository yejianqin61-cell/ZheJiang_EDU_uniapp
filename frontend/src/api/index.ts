import type { ApiResponse } from '../types';

const BASE_URL = 'http://localhost:3000/v1';

function getToken(): string {
  return uni.getStorageSync('accessToken') ?? '';
}

async function request<T>(
  method: 'GET' | 'POST' | 'DELETE',
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
        if (body.code === 0) {
          resolve(body);
        } else {
          uni.showToast({ title: body.message, icon: 'none' });
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
export function login(code: string) {
  return request<{ accessToken: string; user: any }>('POST', '/auth/login', { code });
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

export function regeneratePaper(paperId: string) {
  return request<any>('POST', `/papers/${paperId}/regenerate`);
}

// === Orders ===
export function createOrder(paperId: string) {
  return request<any>('POST', '/orders', { paperId });
}

export function getOrders(page: number, pageSize: number, subject?: string, status?: string) {
  let url = `/orders?page=${page}&pageSize=${pageSize}`;
  if (subject) url += `&subject=${subject}`;
  if (status) url += `&status=${status}`;
  return request<any>('GET', url);
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

// === Admin ===
export function getDashboardStats() {
  return request<any>('GET', '/admin/questions/stats');
}

export function uploadFile(filePath: string, subject: string, grade: string) {
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

export function getFileStatus(fileId: string) {
  return request<any>('GET', `/admin/files/${fileId}`);
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

export function getAdminFiles(page: number, pageSize: number, status?: string) {
  let url = `/admin/files?page=${page}&pageSize=${pageSize}`;
  if (status) url += `&status=${status}`;
  return request<any>('GET', url);
}

export function deleteFile(fileId: string) {
  return request<any>('DELETE', `/admin/files/${fileId}`);
}
