import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePaperStore } from '@/stores/paper'
import PaperPreviewPage from '@/pages/paper/preview/index.vue'

const routerPush = vi.fn()
const routerReplace = vi.fn()
const pricingApiMocks = vi.hoisted(() => ({
  getPublicPricing: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
  }),
}))

vi.mock('@/api/modules/pricing', () => ({
  getPublicPricing: pricingApiMocks.getPublicPricing,
}))

vi.mock('@/composables/useMarkdown', () => ({
  renderMarkdown: (content: string) => content,
}))

const mountPage = (pinia = createPinia()) =>
  mount(PaperPreviewPage, {
    global: {
      plugins: [pinia],
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        'el-tag': { template: '<span><slot /></span>' },
        'el-button': { template: '<button><slot /></button>' },
      },
    },
  })

describe('Paper preview page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    routerPush.mockReset()
    routerReplace.mockReset()
    pricingApiMocks.getPublicPricing.mockReset()
  })

  it('redirects to paper config when current paper is missing', async () => {
    mountPage()
    await nextTick()

    expect(routerReplace).toHaveBeenCalledWith('/paper/config')
  })

  it('renders preview content and pricing text', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const paperStore = usePaperStore()
    paperStore.currentPaper = {
      paperId: 'paper-1',
      title: '五年级数学测试卷',
      generateTime: 2,
      questions: [
        { index: 1, type: '选择题', content: '题目1', options: ['A', 'B'] },
        { index: 2, type: '填空题', content: '题目2', options: [] },
        { index: 3, type: '判断题', content: '题目3', options: [] },
        { index: 4, type: '选择题', content: '题目4', options: ['A', 'B'] },
        { index: 5, type: '应用题', content: '题目5', options: [] },
        { index: 6, type: '应用题', content: '题目6', options: [] },
      ],
    } as any
    pricingApiMocks.getPublicPricing.mockResolvedValue({
      download: { unitPrice: 150 },
      print: [
        { minQuantity: 1, maxQuantity: 9, unitPrice: 80 },
        { minQuantity: 10, maxQuantity: null, unitPrice: 60 },
      ],
    })

    const wrapper = mountPage(pinia)
    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('五年级数学测试卷')
    expect(wrapper.text()).toContain('共 6 题')
    expect(wrapper.text()).toContain('前 5 题免费预览')
    expect(wrapper.text()).toContain('¥1.50/题 × 6题 = ¥9.00')
    expect(wrapper.text()).toContain('¥0.80~0.60/份')
  })

  it('navigates to payment and print checkout actions', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const paperStore = usePaperStore()
    paperStore.currentPaper = {
      paperId: 'paper-9',
      title: '测试卷',
      generateTime: 1,
      questions: [{ index: 1, type: '选择题', content: '题目1', options: [] }],
    } as any
    pricingApiMocks.getPublicPricing.mockResolvedValue({
      download: { unitPrice: 100 },
      print: [{ minQuantity: 1, maxQuantity: null, unitPrice: 50 }],
    })

    const wrapper = mountPage(pinia)
    await nextTick()

    await (wrapper.vm as any).goDownloadPay()
    await (wrapper.vm as any).goPrintCheckout()

    expect(routerPush).toHaveBeenNthCalledWith(1, '/payment?paperId=paper-9&type=download')
    expect(routerPush).toHaveBeenNthCalledWith(2, '/print/checkout?paperId=paper-9')
  })
})
