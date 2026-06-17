import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { OrderItem, CreateOrderResult } from '../types';
import { createOrder as apiCreateOrder, getOrders as apiGetOrders } from '../api';

export const useOrderStore = defineStore('order', () => {
  const orders = ref<OrderItem[]>([]);
  const currentOrder = ref<CreateOrderResult | null>(null);
  const pagination = ref({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const activeTab = ref<'download' | 'print'>('download');

  async function fetchOrders(
    page = 1,
    type?: 'download' | 'print',
    scope?: 'mine' | 'others',
    subject?: string,
    status?: string,
  ) {
    const res = await apiGetOrders({
      page, pageSize: pagination.value.pageSize, type, scope, subject, status,
    });
    orders.value = res.data.list;
    pagination.value = res.data.pagination;
  }

  async function create(paperId: string, type: 'download' | 'print' = 'download', copies?: number, shippingAddressId?: string) {
    const res = await apiCreateOrder({ paperId, type, copies, shippingAddressId });
    currentOrder.value = res.data;
    return res.data;
  }

  return { orders, currentOrder, pagination, activeTab, fetchOrders, create };
});
