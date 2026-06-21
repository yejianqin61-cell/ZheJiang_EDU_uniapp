import { mount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminPricingPage from '@/pages/admin/pricing/index.vue'

const adminApiMocks = vi.hoisted(() => ({
  getPricing: vi.fn(),
  updatePricing: vi.fn(),
}))

vi.mock('@/api/modules/admin', () => ({
  getPricing: adminApiMocks.getPricing,
  updatePricing: adminApiMocks.updatePricing,
}))

const mountPage = () =>
  mount(AdminPricingPage, {
    global: {
      directives: {
        loading: {},
      },
      stubs: {
        'el-input-number': true,
        'el-button': { template: '<button><slot /></button>' },
      },
    },
  })

describe('Admin pricing page', () => {
  beforeEach(() => {
    adminApiMocks.getPricing.mockReset()
    adminApiMocks.updatePricing.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessageBox.confirm).mockReset()
  })

  it('loads pricing config on mount and merges defaults', async () => {
    adminApiMocks.getPricing.mockResolvedValue({
      download: { unitPrice: 300, description: '按题计费' },
      print: [{ tier: 1, minQuantity: 1, maxQuantity: 20, unitPrice: 450 }],
    })

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(adminApiMocks.getPricing).toHaveBeenCalled()
    expect((wrapper.vm as any).pricing.download.unitPrice).toBe(300)
    expect((wrapper.vm as any).pricing.exercise.unitPrice).toBe(500)
  })

  it('saves pricing config after confirmation', async () => {
    adminApiMocks.getPricing.mockResolvedValue({})
    adminApiMocks.updatePricing.mockResolvedValue({ ok: true })
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm' as any)

    const wrapper = mountPage()
    await nextTick()

    ;(wrapper.vm as any).pricing.download.unitPrice = 260
    await (wrapper.vm as any).save()

    expect(adminApiMocks.updatePricing).toHaveBeenCalledWith((wrapper.vm as any).pricing)
    expect(ElMessage.success).toHaveBeenCalledWith('定价已更新')
  })
})
