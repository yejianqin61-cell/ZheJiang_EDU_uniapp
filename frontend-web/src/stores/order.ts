import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { OrderItem, CreateOrderResult } from '@/types'
import api from '@/api/index'

export const useOrderStore = defineStore('order', () => {
  const orders = ref<OrderItem[]>([])
  const currentOrder = ref<CreateOrderResult | null>(null)
  const pagination = ref({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
  const activeTab = ref<'download' | 'print' | 'exercise'>('download')

  async function fetchOrders(page = 1, type?: 'download' | 'print' | 'exercise') {
    const data = await api.get('/orders', { params: { page, pageSize: pagination.value.pageSize, type } })
    orders.value = data.list ?? data
    if (data.pagination) pagination.value = data.pagination
  }

  async function create(paperId: string, type: 'download' | 'print' | 'exercise' = 'download', copies?: number, shippingAddressId?: string) {
    const data = await api.post('/orders', { paperId, type, copies, shippingAddressId })
    currentOrder.value = data
    return data
  }

  return { orders, currentOrder, pagination, activeTab, fetchOrders, create }
})
