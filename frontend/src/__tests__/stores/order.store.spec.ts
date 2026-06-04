/**
 * Order Store 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('../../api', () => ({
  createOrder: vi.fn(),
  getOrders: vi.fn(),
}));

import { useOrderStore } from '../../stores/order';
import { createOrder, getOrders } from '../../api';

describe('Order Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have empty orders and null currentOrder', () => {
      const store = useOrderStore();
      expect(store.orders).toEqual([]);
      expect(store.currentOrder).toBeNull();
      expect(store.pagination.total).toBe(0);
    });
  });

  describe('fetchOrders', () => {
    it('should fetch and populate orders', async () => {
      vi.mocked(getOrders).mockResolvedValue({
        code: 0, message: 'ok',
        data: {
          list: [
            { id: 'o1', orderNo: 'ORD001', amount: 500, status: 'paid', paperTitle: '测试卷', createdAt: '2026-06-04' },
          ],
          pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        },
      } as any);

      const store = useOrderStore();
      await store.fetchOrders(1);

      expect(store.orders).toHaveLength(1);
      expect(store.orders[0].orderNo).toBe('ORD001');
      expect(store.pagination.total).toBe(1);
    });

    it('should handle empty order list', async () => {
      vi.mocked(getOrders).mockResolvedValue({
        code: 0, data: { list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } },
      } as any);

      const store = useOrderStore();
      await store.fetchOrders(1);

      expect(store.orders).toEqual([]);
      expect(store.pagination.total).toBe(0);
    });
  });

  describe('create', () => {
    it('should create order and set currentOrder', async () => {
      vi.mocked(createOrder).mockResolvedValue({
        code: 0, message: 'ok',
        data: { orderId: 'o1', orderNo: 'ORD001', amount: 500, wxPayParams: { paySign: 'SIGN' } },
      } as any);

      const store = useOrderStore();
      const result = await store.create('paper-1');

      expect(result.orderId).toBe('o1');
      expect(store.currentOrder?.orderNo).toBe('ORD001');
      expect(store.currentOrder?.wxPayParams).toBeDefined();
    });
  });
});
