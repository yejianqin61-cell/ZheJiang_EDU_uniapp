import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OrderDetailPage from '@/pages/orders/detail/index.vue'

const routerBack = vi.fn()
const routeState = vi.hoisted(() => ({
  params: { id: 'order-1' as string | undefined },
}))
const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    back: routerBack,
  }),
}))

vi.mock('@/api/index', () => ({
  default: apiMocks,
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

describe('Order detail page', () => {
  beforeEach(() => {
    routeState.params.id = 'order-1'
    routerBack.mockReset()
    apiMocks.get.mockReset()
    apiMocks.post.mockReset()
    vi.mocked(ElMessage.info).mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.error).mockReset()
    vi.stubGlobal('open', vi.fn())
  })

  it('loads order detail on mount', async () => {
    apiMocks.get.mockResolvedValueOnce({
      orderId: 'order-1',
      paperId: 'paper-1',
      orderNo: 'NO001',
      paperTitle: '五年级数学卷',
      amount: 1200,
      status: 'paid',
      type: 'download',
      createdAt: '2026-06-21 10:00:00',
    })

    mountPage()
    await Promise.resolve()

    expect(apiMocks.get).toHaveBeenCalledWith('/orders/order-1')
  })

  it('exports exercise order from download endpoint', async () => {
    apiMocks.get.mockResolvedValueOnce({
      orderId: 'order-1',
      orderNo: 'NO001',
      paperTitle: '同步练习',
      amount: 1200,
      status: 'paid',
      type: 'exercise',
      createdAt: '2026-06-21 10:00:00',
    })
    apiMocks.get.mockResolvedValueOnce({
      docxUrl: 'https://example.com/exercise.docx',
    })

    const wrapper = mountPage()
    await Promise.resolve()

    await (wrapper.vm as any).handleExport()

    expect(apiMocks.get).toHaveBeenCalledWith('/orders/order-1/download')
    expect(window.open).toHaveBeenCalledWith('https://example.com/exercise.docx', '_blank')
    expect(ElMessage.success).toHaveBeenCalledWith('开始下载')
  })

  it('exports normal download order through paper export endpoint', async () => {
    apiMocks.get.mockResolvedValueOnce({
      orderId: 'order-1',
      paperId: 'paper-9',
      orderNo: 'NO001',
      paperTitle: '数学试卷',
      amount: 1200,
      status: 'paid',
      type: 'download',
      createdAt: '2026-06-21 10:00:00',
    })
    apiMocks.post.mockResolvedValueOnce({
      downloadUrl: 'https://example.com/paper.docx',
    })

    const wrapper = mountPage()
    await Promise.resolve()

    await (wrapper.vm as any).handleExport()

    expect(ElMessage.info).toHaveBeenCalledWith('正在生成试卷...')
    expect(apiMocks.post).toHaveBeenCalledWith('/papers/paper-9/export/docx')
    expect(ElMessage.success).toHaveBeenCalledWith('导出成功')
    expect(window.open).toHaveBeenCalledWith('https://example.com/paper.docx', '_blank')
  })
})
