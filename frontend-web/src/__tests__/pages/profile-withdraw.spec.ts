import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfileWithdrawPage from '@/pages/profile/withdraw/index.vue'

const routerBack = vi.fn()
const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    back: routerBack,
  }),
}))

vi.mock('@/api/index', () => ({
  default: apiMocks,
}))

const mountPage = () =>
  mount(ProfileWithdrawPage, {
    global: {
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        'el-input': { template: '<input />' },
        'el-button': { template: '<button><slot /></button>' },
      },
    },
  })

describe('Profile withdraw page', () => {
  beforeEach(() => {
    routerBack.mockReset()
    apiMocks.get.mockReset()
    apiMocks.post.mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('loads balance on mount', async () => {
    apiMocks.get.mockResolvedValue({ balance: 5000 })

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(apiMocks.get).toHaveBeenCalledWith('/users/me/balance')
    expect(wrapper.text()).toContain('¥50.00')
  })

  it('warns when withdraw amount is missing', async () => {
    apiMocks.get.mockResolvedValue({ balance: 5000 })
    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).submit()

    expect(ElMessage.warning).toHaveBeenCalledWith('请输入金额')
    expect(apiMocks.post).not.toHaveBeenCalled()
  })

  it('warns when balance is insufficient', async () => {
    apiMocks.get.mockResolvedValue({ balance: 5000 })
    const wrapper = mountPage()
    await nextTick()
    ;(wrapper.vm as any).amount = 60

    await (wrapper.vm as any).submit()

    expect(ElMessage.warning).toHaveBeenCalledWith('余额不足')
    expect(apiMocks.post).not.toHaveBeenCalled()
  })

  it('submits withdraw request and returns on success', async () => {
    apiMocks.get.mockResolvedValue({ balance: 5000 })
    apiMocks.post.mockResolvedValue({ ok: true })
    const wrapper = mountPage()
    await nextTick()
    ;(wrapper.vm as any).amount = 20

    await (wrapper.vm as any).submit()

    expect(apiMocks.post).toHaveBeenCalledWith('/withdrawals', { amount: 2000 })
    expect(ElMessage.success).toHaveBeenCalledWith('提现申请已提交')
    expect(routerBack).toHaveBeenCalled()
  })
})
