import api from '../index'
import type { ExercisePaper } from '@/types'

export type ExerciseCategoryType = 'unit' | 'topic' | 'exam'

export interface ExerciseCategory {
  id: string
  type: ExerciseCategoryType
  grade: string
  subject: string
  name: string
  term?: string | null
  examType?: string | null
  sortOrder?: number | null
  createdBy?: string | null
  createdAt?: string
}

export interface ExerciseLesson {
  id: string
  unitId: string
  name: string
  sortOrder?: number | null
  createdBy?: string | null
  createdAt?: string
}

export interface ExerciseCategoryCreatePayload {
  type: ExerciseCategoryType
  grade: string
  subject: string
  name: string
  term?: string
  examType?: string
}

export interface ExerciseCategoryUpdatePayload {
  name?: string
  term?: string
  examType?: string
  sortOrder?: number
}

export interface ExerciseLessonCreatePayload {
  unitId: string
  name: string
}

export interface ExerciseLessonUpdatePayload {
  name?: string
  sortOrder?: number
}

interface ExercisePaperListResponse {
  list: ExercisePaper[]
}

export function getExerciseCategories(params: { type?: string; grade?: string; subject?: string }) {
  return api.get('/exercise/categories', { params })
}
export function getExerciseLessons(unitId: string) {
  return api.get('/exercise/lessons', { params: { unitId } })
}
export function getPapersByCategory(categoryId: string) {
  return api.get<ExercisePaper[] | ExercisePaperListResponse>('/exercise/papers', { params: { categoryId } })
}
export function getPapersByLesson(lessonId: string) {
  return api.get<ExercisePaper[] | ExercisePaperListResponse>('/exercise/papers', { params: { lessonId } })
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

export function adminListCategories(params: { type?: string; grade?: string; subject?: string }) {
  return api.get<ExerciseCategory[]>('/admin/exercise/categories', { params })
}
export function adminCreateCategory(data: ExerciseCategoryCreatePayload) {
  return api.post('/admin/exercise/categories', data)
}
export function adminUpdateCategory(id: string, data: ExerciseCategoryUpdatePayload) {
  return api.put(`/admin/exercise/categories/${id}`, data)
}
export function adminDeleteCategory(id: string) {
  return api.delete(`/admin/exercise/categories/${id}`)
}
export function adminListLessons(unitId: string) {
  return api.get<ExerciseLesson[]>('/admin/exercise/lessons', { params: { unitId } })
}
export function adminCreateLesson(data: ExerciseLessonCreatePayload) {
  return api.post('/admin/exercise/lessons', data)
}
export function adminUpdateLesson(id: string, data: ExerciseLessonUpdatePayload) {
  return api.put(`/admin/exercise/lessons/${id}`, data)
}
export function adminDeleteLesson(id: string) {
  return api.delete(`/admin/exercise/lessons/${id}`)
}
export function adminListPapers(categoryId?: string, lessonId?: string) {
  return api.get<ExercisePaper[]>('/admin/exercise/papers', { params: { categoryId, lessonId } })
}
export function adminCreatePaper(formData: FormData) {
  return api.post('/admin/exercise/papers', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
}
export function adminDeletePaper(id: string) {
  return api.delete(`/admin/exercise/papers/${id}`)
}

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
