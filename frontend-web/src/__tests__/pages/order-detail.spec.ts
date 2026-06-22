import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OrderDetailPage from '@/pages/orders/detail/index.vue'
import type { OrderDetail } from '@/types'

const routerBack = vi.fn()
const routeState = vi.hoisted(() => ({
  params: { id: 'order-1' as string | undefined },
}))
const orderApiMocks = vi.hoisted(() => ({
  getOrder: vi.fn(),
  getOrderDownload: vi.fn(),
}))
const paperApiMocks = vi.hoisted(() => ({
  exportDocx: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    back: routerBack,
  }),
}))

vi.mock('@/api/modules/order', () => ({
  getOrder: orderApiMocks.getOrder,
  getOrderDownload: orderApiMocks.getOrderDownload,
}))

vi.mock('@/api/modules/paper', () => ({
  exportDocx: paperApiMocks.exportDocx,
}))

const mountPage = () =>
  mount(OrderDetailPage, {
    global: {
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        'el-tag': { template: '<span><slot /></span>' },
        'el-button': { template: '<button><slot /></button>' },
        'el-timeline': { template: '<div><slot /></div>' },
        'el-timeline-item': { template: '<div><slot /></div>' },
      },
    },
  })

type OrderDetailPageVm = {
  handleExport: () => Promise<void>
}

function createOrderDetail(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    orderId: 'order-1',
    paperId: 'paper-1',
    orderNo: 'NO001',
    type: 'download',
    paperTitle: '五年级数学卷',
    questionCount: 20,
    amount: 1200,
    unitPrice: 60,
    status: 'paid',
    createdAt: '2026-06-21 10:00:00',
    ...overrides,
  }
}

describe('Order detail page', () => {
  beforeEach(() => {
    routeState.params.id = 'order-1'
    routerBack.mockReset()
    orderApiMocks.getOrder.mockReset()
    orderApiMocks.getOrderDownload.mockReset()
    paperApiMocks.exportDocx.mockReset()
    vi.mocked(ElMessage.info).mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.error).mockReset()
    vi.stubGlobal('open', vi.fn())
  })

  it('loads order detail on mount', async () => {
    orderApiMocks.getOrder.mockResolvedValueOnce(createOrderDetail())

    mountPage()
    await Promise.resolve()

    expect(orderApiMocks.getOrder).toHaveBeenCalledWith('order-1')
  })

  it('exports exercise order from download endpoint', async () => {
    orderApiMocks.getOrder.mockResolvedValueOnce(createOrderDetail({
      type: 'exercise',
      paperTitle: '同步练习',
    }))
    orderApiMocks.getOrderDownload.mockResolvedValueOnce({
      docxUrl: 'https://example.com/exercise.docx',
    })

    const wrapper = mountPage()
    await Promise.resolve()

    await (wrapper.vm as OrderDetailPageVm).handleExport()

    expect(orderApiMocks.getOrderDownload).toHaveBeenCalledWith('order-1')
    expect(window.open).toHaveBeenCalledWith('https://example.com/exercise.docx', '_blank')
    expect(ElMessage.success).toHaveBeenCalledWith('开始下载')
  })

  it('exports normal download order through paper export endpoint', async () => {
    orderApiMocks.getOrder.mockResolvedValueOnce(createOrderDetail({
      paperId: 'paper-9',
      paperTitle: '数学试卷',
    }))
    paperApiMocks.exportDocx.mockResolvedValueOnce({
      downloadUrl: 'https://example.com/paper.docx',
    })

    const wrapper = mountPage()
    await Promise.resolve()

    await (wrapper.vm as OrderDetailPageVm).handleExport()

    expect(ElMessage.info).toHaveBeenCalledWith('正在生成试卷...')
    expect(paperApiMocks.exportDocx).toHaveBeenCalledWith('paper-9')
    expect(ElMessage.success).toHaveBeenCalledWith('导出成功')
    expect(window.open).toHaveBeenCalledWith('https://example.com/paper.docx', '_blank')
  })

  it('shows fallback when order load fails without message', async () => {
    orderApiMocks.getOrder.mockRejectedValueOnce({ code: 500 })

    mountPage()
    await Promise.resolve()

    expect(ElMessage.error).toHaveBeenCalledWith('订单加载失败')
  })

  it('shows fallback when export fails without message', async () => {
    orderApiMocks.getOrder.mockResolvedValueOnce(createOrderDetail({
      paperId: 'paper-9',
      paperTitle: '数学试卷',
    }))
    paperApiMocks.exportDocx.mockRejectedValueOnce({ code: 500 })

    const wrapper = mountPage()
    await Promise.resolve()

    await (wrapper.vm as OrderDetailPageVm).handleExport()

    expect(ElMessage.error).toHaveBeenCalledWith('导出失败')
  })
})
