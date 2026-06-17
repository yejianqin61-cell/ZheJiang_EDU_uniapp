<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getOrders, getOrderDownload, updatePrintStatus, adminExportOrder } from '../../../api';
import { buildDownloadUrl } from '../../../config/env';
import type { OrderItem } from '../../../types';

// Scope & Tab
const scope = ref<'mine' | 'others'>('mine');
const activeTab = ref<'download' | 'print'>('download');

const orders = ref<OrderItem[]>([]);
const pagination = ref({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
const loading = ref(false);

onMounted(() => { fetchOrders(); });

async function fetchOrders(page = 1) {
  loading.value = true;
  try {
    const res = await getOrders({
      page, pageSize: pagination.value.pageSize,
      type: activeTab.value,
      scope: scope.value,
    });
    orders.value = res.data.list;
    pagination.value = res.data.pagination;
  } catch { /* handle */ }
  loading.value = false;
}

function switchScope(s: 'mine' | 'others') {
  scope.value = s;
  fetchOrders();
}

function switchTab(tab: 'download' | 'print') {
  activeTab.value = tab;
  fetchOrders();
}

function goDetail(orderId: string) {
  uni.navigateTo({ url: `/pages/orders/detail/index?orderId=${orderId}` });
}

async function handleDownload(orderId: string, e: Event) {
  e.stopPropagation && e.stopPropagation();
  try {
    const res = await getOrderDownload(orderId);
    const url = res.data.docxUrl ?? res.data.pdfUrl ?? '';
    if (!url) { uni.showToast({ title: '暂无导出文件', icon: 'none' }); return; }
    const fullUrl = buildDownloadUrl(url);
    // #ifdef H5
    window.open(fullUrl, '_blank');
    // #endif
    // #ifndef H5
    uni.downloadFile({
      url: fullUrl,
      success: (r) => { if (r.statusCode === 200) uni.openDocument({ filePath: r.tempFilePath, showMenu: true }); },
      fail: () => uni.showToast({ title: '下载失败', icon: 'none' }),
    });
    // #endif
  } catch { uni.showToast({ title: '获取下载链接失败', icon: 'none' }); }
}

const PRINT_ACTION_MAP: Record<string, { label: string; next: string | null }> = {
  null:      { label: '标记打印中', next: 'printing' },
  printing:  { label: '标记已发货', next: 'shipped' },
  shipped:   { label: '标记已签收', next: 'delivered' },
};
const PRINT_ROLLBACK_MAP: Record<string, { label: string; next: string | null }> = {
  printing:  { label: '退回待处理', next: null },
  shipped:   { label: '退回打印中', next: 'printing' },
  delivered: { label: '退回已发货', next: 'shipped' },
};

const PRINT_STATUS_LABEL: Record<string, string> = {
  null: '待处理',
  printing: '打印中',
  shipped: '已发货',
  delivered: '已签收',
};

async function handlePrintAction(orderId: string, nextStatus: string) {
  try {
    await updatePrintStatus(orderId, nextStatus);
    uni.showToast({ title: '状态已更新', icon: 'success' });
    fetchOrders(pagination.value.page);
  } catch (e: any) {
    uni.showToast({ title: e?.message ?? '更新失败', icon: 'none' });
  }
}

async function handleAdminDownload(orderId: string, e: Event) {
  e.stopPropagation && e.stopPropagation();
  try {
    uni.showToast({ title: '正在生成试卷...', icon: 'loading', duration: 3000 });
    const res = await adminExportOrder(orderId);
    const url = res.data.downloadUrl ?? '';
    if (!url) { uni.showToast({ title: '导出失败', icon: 'none' }); return; }
    const fullUrl = buildDownloadUrl(url);
    // #ifdef H5
    window.open(fullUrl, '_blank');
    // #endif
    // #ifndef H5
    uni.downloadFile({
      url: fullUrl,
      success: (r) => { if (r.statusCode === 200) uni.openDocument({ filePath: r.tempFilePath, showMenu: true }); },
      fail: () => uni.showToast({ title: '下载失败', icon: 'none' }),
    });
    // #endif
  } catch (e: any) {
    uni.showToast({ title: e?.message ?? '导出失败', icon: 'none' });
  }
}
</script>

<template>
  <view class="admin-orders">
    <!-- Scope Filter -->
    <view class="scope-bar">
      <view
        class="scope-item"
        :class="{ active: scope === 'mine' }"
        @tap="switchScope('mine')"
      >
        <text>我的订单</text>
      </view>
      <view
        class="scope-item"
        :class="{ active: scope === 'others' }"
        @tap="switchScope('others')"
      >
        <text>所有用户订单</text>
      </view>
    </view>

    <!-- Tab Bar -->
    <view class="tab-bar">
      <view
        class="tab-item"
        :class="{ active: activeTab === 'download' }"
        @tap="switchTab('download')"
      >
        <text>下载服务</text>
      </view>
      <view
        class="tab-item"
        :class="{ active: activeTab === 'print' }"
        @tap="switchTab('print')"
      >
        <text>打印服务</text>
      </view>
    </view>

    <!-- Download Tab -->
    <view v-if="activeTab === 'download'" class="order-list">
      <view v-if="orders.length === 0" class="empty">暂无下载订单</view>
      <view
        v-for="o in orders" :key="o.orderId"
        class="order-card"
        @tap="goDetail(o.orderId)"
      >
        <view class="order-left">
          <text class="order-type-tag download-tag">📥 下载</text>
          <text class="order-title">{{ o.paperTitle }}</text>
          <text class="order-meta">¥{{ (o.amount / 100).toFixed(2) }} | {{ o.createdAt }}</text>
        </view>
        <view class="order-right">
          <view class="order-status" :class="o.status">
            {{ o.status === 'paid' ? '已支付' : o.status === 'pending' ? '待支付' : '已取消' }}
          </view>
          <!-- Only show download for own orders -->
          <button
            v-if="scope === 'mine' && o.status === 'paid' && o.hasExport !== false"
            class="btn-download-sm"
            @tap="(e: Event) => handleDownload(o.orderId, e)"
          >
            下载
          </button>
          <text v-if="scope === 'others'" class="readonly-hint">只读</text>
        </view>
      </view>
    </view>

    <!-- Print Tab -->
    <view v-if="activeTab === 'print'" class="order-list">
      <view v-if="orders.length === 0" class="empty">暂无打印订单</view>
      <view
        v-for="o in orders" :key="o.orderId"
        class="order-card print-card"
        @tap="goDetail(o.orderId)"
      >
        <view class="order-left">
          <text class="order-type-tag print-tag">🖨️ 打印</text>
          <text class="order-title">{{ o.paperTitle }}</text>
          <text class="order-meta">
            {{ o.copies ? `${o.copies}份 | ` : '' }}¥{{ (o.amount / 100).toFixed(2) }}
          </text>
          <text v-if="o.shipping" class="order-addr">{{ o.shipping.receiverName }} {{ o.shipping.phone }}</text>
        </view>
        <view class="order-right">
          <view class="print-status" :class="o.printStatus ?? 'null'">
            {{ PRINT_STATUS_LABEL[String(o.printStatus)] ?? '待处理' }}
          </view>
          <!-- Admin can update print status (scope=others) or just view (scope=mine) -->
          <view v-if="scope === 'others' && o.status === 'paid'" class="print-actions">
            <button
              v-if="PRINT_ACTION_MAP[String(o.printStatus)]"
              class="btn-action-sm"
              @tap.stop="handlePrintAction(o.orderId, PRINT_ACTION_MAP[String(o.printStatus)]!.next!)"
            >
              {{ PRINT_ACTION_MAP[String(o.printStatus)]!.label }}
            </button>
            <button
              v-if="PRINT_ROLLBACK_MAP[String(o.printStatus)]"
              class="btn-rollback-sm"
              @tap.stop="handlePrintAction(o.orderId, PRINT_ROLLBACK_MAP[String(o.printStatus)]!.next!)"
            >
              {{ PRINT_ROLLBACK_MAP[String(o.printStatus)]!.label }}
            </button>
            <button
              class="btn-download-sm"
              @tap.stop="(e: Event) => handleAdminDownload(o.orderId, e)"
            >
              下载试卷
            </button>
          </view>
          <text v-if="scope === 'mine'" class="readonly-hint">我的</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.admin-orders { min-height: 100vh; background: #f5f5f5; }

/* Scope Filter */
.scope-bar { display: flex; background: #fff; padding: 16rpx 30rpx; gap: 20rpx; }
.scope-item { padding: 14rpx 32rpx; border-radius: 30rpx; font-size: 28rpx; color: #666; background: #f5f5f5; transition: all 0.2s; }
.scope-item.active { background: #1677ff; color: #fff; font-weight: 500; }

/* Tab Bar */
.tab-bar { display: flex; background: #fff; border-bottom: 1rpx solid #e8e8e8; position: sticky; top: 0; z-index: 10; }
.tab-item { flex: 1; text-align: center; padding: 24rpx 0; font-size: 30rpx; color: #666; border-bottom: 4rpx solid transparent; }
.tab-item.active { color: #1677ff; border-bottom-color: #1677ff; font-weight: 600; }

.empty { text-align: center; padding: 200rpx 0; color: #999; font-size: 28rpx; }

/* Order List */
.order-list { padding: 16rpx 0; }
.order-card { display: flex; align-items: center; background: #fff; margin: 12rpx 30rpx; border-radius: 12rpx; padding: 24rpx; }
.order-left { flex: 1; min-width: 0; }
.order-type-tag { font-size: 22rpx; margin-bottom: 4rpx; display: inline-block; }
.download-tag { color: #1677ff; }
.print-tag { color: #fa8c16; }
.order-title { font-size: 28rpx; font-weight: 500; display: block; margin-bottom: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.order-meta { font-size: 22rpx; color: #999; display: block; }
.order-addr { font-size: 22rpx; color: #bbb; display: block; margin-top: 4rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.order-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8rpx; flex-shrink: 0; margin-left: 16rpx; }
.order-status { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 4rpx; }
.order-status.paid { background: #f6ffed; color: #52c41a; }
.order-status.pending { background: #fff7e6; color: #fa8c16; }

.print-status { font-size: 22rpx; padding: 4rpx 10rpx; border-radius: 4rpx; }
.print-status.null { background: #fff7e6; color: #fa8c16; }
.print-status.printing { background: #e6f7ff; color: #1677ff; }
.print-status.shipped { background: #f0f5ff; color: #2f54eb; }
.print-status.delivered { background: #f6ffed; color: #52c41a; }

.btn-download-sm { height: 52rpx; line-height: 52rpx; padding: 0 20rpx; font-size: 24rpx; background: #1677ff; color: #fff; border: none; border-radius: 8rpx; }
.btn-action-sm { height: 52rpx; line-height: 52rpx; padding: 0 16rpx; font-size: 24rpx; background: #1677ff; color: #fff; border: none; border-radius: 8rpx; }
.btn-rollback-sm { height: 52rpx; line-height: 52rpx; padding: 0 16rpx; font-size: 22rpx; background: #fff; color: #999; border: 1rpx solid #d9d9d9; border-radius: 8rpx; margin-top: 4rpx; }
.print-actions { display: flex; flex-direction: column; gap: 4rpx; align-items: flex-end; }
.readonly-hint { font-size: 22rpx; color: #ccc; }
</style>
