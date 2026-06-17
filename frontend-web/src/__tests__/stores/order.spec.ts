import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOrderStore } from '@/stores/order'

describe('OrderStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始状态：空订单列表', () => {
    const order = useOrderStore()
    expect(order.orders).toEqual([])
    expect(order.currentOrder).toBeNull()
    expect(order.activeTab).toBe('download')
  })

  it('pagination 默认值为 page=1, pageSize=20', () => {
    const order = useOrderStore()
    expect(order.pagination.page).toBe(1)
    expect(order.pagination.pageSize).toBe(20)
    expect(order.pagination.total).toBe(0)
    expect(order.pagination.totalPages).toBe(0)
  })

  it('activeTab 默认为 download', () => {
    const order = useOrderStore()
    expect(order.activeTab).toBe('download')
  })
})
