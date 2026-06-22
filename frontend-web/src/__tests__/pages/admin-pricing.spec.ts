import { mount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminPricingPage from '@/pages/admin/pricing/index.vue'
import type { PricingConfig } from '@/types'

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

type AdminPricingPageVm = {
  pricing: PricingConfig
  save: () => Promise<void>
}

describe('Admin pricing page', () => {
  beforeEach(() => {
    adminApiMocks.getPricing.mockReset()
    adminApiMocks.updatePricing.mockReset()
    vi.mocked(ElMessage.error).mockReset()
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
    expect((wrapper.vm as AdminPricingPageVm).pricing.download.unitPrice).toBe(300)
    expect((wrapper.vm as AdminPricingPageVm).pricing.exercise.unitPrice).toBe(500)
  })

  it('shows error when pricing config fails to load', async () => {
    adminApiMocks.getPricing.mockRejectedValue(new Error('定价配置接口异常'))

    mountPage()
    await nextTick()
    await nextTick()

    expect(ElMessage.error).toHaveBeenCalledWith('定价配置接口异常')
  })

  it('saves pricing config after confirmation', async () => {
    adminApiMocks.getPricing.mockResolvedValue({})
    adminApiMocks.updatePricing.mockResolvedValue({ ok: true })
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm')

    const wrapper = mountPage()
    await nextTick()

    ;(wrapper.vm as AdminPricingPageVm).pricing.download.unitPrice = 260
    await (wrapper.vm as AdminPricingPageVm).save()

    expect(adminApiMocks.updatePricing).toHaveBeenCalledWith((wrapper.vm as AdminPricingPageVm).pricing)
    expect(ElMessage.success).toHaveBeenCalledWith('定价已更新')
  })

  it('shows error when saving pricing config fails', async () => {
    adminApiMocks.getPricing.mockResolvedValue({})
    adminApiMocks.updatePricing.mockRejectedValue(new Error('保存失败'))
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm')

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as AdminPricingPageVm).save()

    expect(ElMessage.error).toHaveBeenCalledWith('保存失败')
  })

  it('does not show error when save confirmation is canceled', async () => {
    adminApiMocks.getPricing.mockResolvedValue({})
    vi.mocked(ElMessageBox.confirm).mockRejectedValue('cancel')

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as AdminPricingPageVm).save()

    expect(adminApiMocks.updatePricing).not.toHaveBeenCalled()
    expect(ElMessage.error).not.toHaveBeenCalled()
  })
})
