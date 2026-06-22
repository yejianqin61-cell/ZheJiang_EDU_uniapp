import api from '../index'
import type { ShippingAddress } from '@/types'

export type ShippingAddressPayload = Omit<ShippingAddress, 'id'>

interface ShippingAddressListResponse {
  list: ShippingAddress[]
}

export async function listAddresses() {
  const data = await api.get<ShippingAddress[] | ShippingAddressListResponse>('/shipping-addresses')
  return Array.isArray(data) ? data : data?.list ?? []
}

export function getAddress(addressId: string) {
  return api.get<ShippingAddress>(`/shipping-addresses/${addressId}`)
}

export function createAddress(data: ShippingAddressPayload) {
  return api.post('/shipping-addresses', data)
}

export function updateAddress(addressId: string, data: ShippingAddressPayload) {
  return api.put(`/shipping-addresses/${addressId}`, data)
}

export function deleteAddress(addressId: string) {
  return api.delete(`/shipping-addresses/${addressId}`)
}
