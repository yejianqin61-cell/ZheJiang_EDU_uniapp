import api from '../index'
import type { ExercisePaper } from '@/types'

// ===== 用户端 =====
export function getExerciseCategories(params: { type?: string; grade?: string; subject?: string }) {
  return api.get('/exercise/categories', { params })
}
export function getExerciseLessons(unitId: string) {
  return api.get('/exercise/lessons', { params: { unitId } })
}
export function getPapersByCategory(categoryId: string) {
  return api.get('/exercise/papers', { params: { categoryId } })
}
export function getPapersByLesson(lessonId: string) {
  return api.get('/exercise/papers', { params: { lessonId } })
}
export function getPaperDetail(id: string) {
  return api.get<ExercisePaper>(`/exercise/papers/${id}`)
}

export function drawCategory(id: string) {
  return api.post<ExercisePaper>(`/exercise/categories/${id}/draw`)
}
export function drawLesson(id: string) {
  return api.post<ExercisePaper>(`/exercise/lessons/${id}/draw`)
}
export function getExercisePaper(id: string) {
  return api.get<ExercisePaper>(`/exercise/papers/${id}`)
}

// ===== 管理端 =====
export function adminListCategories(params: { type?: string; grade?: string; subject?: string }) {
  return api.get('/admin/exercise/categories', { params })
}
export function adminCreateCategory(data: any) {
  return api.post('/admin/exercise/categories', data)
}
export function adminUpdateCategory(id: string, data: any) {
  return api.put(`/admin/exercise/categories/${id}`, data)
}
export function adminDeleteCategory(id: string) {
  return api.delete(`/admin/exercise/categories/${id}`)
}
export function adminListLessons(unitId: string) {
  return api.get('/admin/exercise/lessons', { params: { unitId } })
}
export function adminCreateLesson(data: any) {
  return api.post('/admin/exercise/lessons', data)
}
export function adminUpdateLesson(id: string, data: any) {
  return api.put(`/admin/exercise/lessons/${id}`, data)
}
export function adminDeleteLesson(id: string) {
  return api.delete(`/admin/exercise/lessons/${id}`)
}
export function adminListPapers(categoryId?: string, lessonId?: string) {
  return api.get('/admin/exercise/papers', { params: { categoryId, lessonId } })
}
export function adminCreatePaper(formData: FormData) {
  return api.post('/admin/exercise/papers', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
}
export function adminDeletePaper(id: string) {
  return api.delete(`/admin/exercise/papers/${id}`)
}

// ===== 练习试卷贡献（教师上传 → 管理员审核）=====
export function uploadExercisePaper(formData: FormData) {
  return api.post('/exercise-contributions/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
}
export function getMyExerciseUploads(params: { page?: number; pageSize?: number; status?: string }) {
  return api.get('/exercise-contributions', { params })
}
export function getMyExerciseUploadDetail(id: string) {
  return api.get(`/exercise-contributions/${id}`)
}
export function deleteMyExerciseUpload(id: string) {
  return api.delete(`/exercise-contributions/${id}`)
}
export function getUploadCategories(params: { grade?: string; subject?: string; exerciseType?: string }) {
  return api.get('/exercise-contributions/categories', { params })
}
export function getUploadLessons(categoryId: string) {
  return api.get('/exercise-contributions/lessons', { params: { categoryId } })
}

// ===== 管理端：练习审核 =====
export function adminListExerciseUploads(params: { page?: number; pageSize?: number; status?: string; subject?: string; grade?: string; exerciseType?: string }) {
  return api.get('/exercise-contributions/admin/list', { params })
}
export function adminApproveExerciseUpload(id: string) {
  return api.post(`/exercise-contributions/admin/${id}/approve`)
}
export function adminRejectExerciseUpload(id: string, note?: string) {
  return api.post(`/exercise-contributions/admin/${id}/reject`, { note })
}
export function adminBatchExerciseUploads(data: { ids: string[]; action: 'approve' | 'reject'; note?: string }) {
  return api.post('/exercise-contributions/admin/batch', data)
}
