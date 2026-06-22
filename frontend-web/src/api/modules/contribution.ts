import { uploadFile } from './admin'
import api from '../index'
import type { AxiosRequestConfig } from 'axios'
import type { ContributionItem, ContributionQuestion } from '@/types'

interface ContributionListResponse {
  list: ContributionItem[]
}

interface ContributionDetailResponse extends ContributionItem {
  questions?: ContributionQuestion[]
}

export async function listContributions() {
  const data = await api.get<ContributionItem[] | ContributionListResponse>('/contributions')
  return Array.isArray(data) ? data : data?.list ?? []
}

export function getContribution(contributionId: string) {
  return api.get<ContributionDetailResponse>(`/contributions/${contributionId}`)
}

export async function getContributionQuestions(contributionId: string) {
  const data = await getContribution(contributionId)
  return data?.questions ?? (Array.isArray(data) ? data : [])
}

export function submitContribution(contributionId: string) {
  return api.post(`/contributions/${contributionId}/submit`)
}

export function uploadContributionFile(formData: FormData, config?: AxiosRequestConfig<FormData>) {
  return uploadFile(formData, config)
}
