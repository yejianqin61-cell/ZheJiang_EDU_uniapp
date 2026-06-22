import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createOrder, getOrders, type OrderType } from '@/api/modules/order'
import type { CreateOrderResult, OrderItem, Pagination } from '@/types'

const DEFAULT_PAGINATION: Pagination = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
}

export const useOrderStore = defineStore('order', () => {
  const orders = ref<OrderItem[]>([])
  const currentOrder = ref<CreateOrderResult | null>(null)
  const pagination = ref<Pagination>({ ...DEFAULT_PAGINATION })
  const activeTab = ref<OrderType>('download')

  async function fetchOrders(page = 1, type?: OrderType) {
    const data = await getOrders({
      page,
      pageSize: pagination.value.pageSize,
      type,
    })

    orders.value = data.list ?? []
    pagination.value = data.pagination ?? { ...DEFAULT_PAGINATION, page, pageSize: pagination.value.pageSize }
  }

  async function create(paperId: string, type: OrderType = 'download', copies?: number, shippingAddressId?: string) {
    const data = await createOrder({ paperId, type, copies, shippingAddressId })
    currentOrder.value = data
    return data
  }

  return { orders, currentOrder, pagination, activeTab, fetchOrders, create }
})
