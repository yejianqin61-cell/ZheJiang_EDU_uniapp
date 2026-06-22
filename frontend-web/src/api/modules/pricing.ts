import api from '../index'
import type { PricingConfig } from '@/types'

export function getPublicPricing() {
  return api.get<PricingConfig>('/pricing/public')
}
