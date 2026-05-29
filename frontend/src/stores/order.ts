import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { OrderItem, CreateOrderResult } from '../types';
import { createOrder, getOrders } from '../api';

export const useOrderStore = defineStore('order', () => {
  const orders = ref<OrderItem[]>([]);
  const currentOrder = ref<CreateOrderResult | null>(null);
  const pagination = ref({ page: 1, pageSize: 20, total: 0, totalPages: 0 });

  async function fetchOrders(page = 1, subject?: string, status?: string) {
    const res = await getOrders(page, pagination.value.pageSize, subject, status);
    orders.value = res.data.list;
    pagination.value = res.data.pagination;
  }

  async function create(paperId: string) {
    const res = await createOrder(paperId);
    currentOrder.value = res.data;
    return res.data;
  }

  return { orders, currentOrder, pagination, fetchOrders, create };
});
