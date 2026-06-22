import { flushPromises, mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfileWithdrawPage from '@/pages/profile/withdraw/index.vue'
import { elInputStub } from '@/__tests__/utils/element-plus-stubs'

const routerBack = vi.fn()
const authApiMocks = vi.hoisted(() => ({
  getMyBalance: vi.fn(),
  withdraw: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    back: routerBack,
  }),
}))

vi.mock('@/api/modules/auth', () => ({
  getMyBalance: authApiMocks.getMyBalance,
  withdraw: authApiMocks.withdraw,
}))

const mountPage = () =>
  mount(ProfileWithdrawPage, {
    global: {
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        'el-input': elInputStub,
        'el-button': { template: '<button><slot /></button>' },
      },
    },
  })

describe('Profile withdraw page', () => {
  beforeEach(() => {
    routerBack.mockReset()
    authApiMocks.getMyBalance.mockReset()
    authApiMocks.withdraw.mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('loads balance on mount', async () => {
    authApiMocks.getMyBalance.mockResolvedValue({ balance: 5000 })

    const wrapper = mountPage()
    await nextTick()
    await flushPromises()

    expect(authApiMocks.getMyBalance).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('¥50.00')
  })

  it('shows error when balance load fails', async () => {
    authApiMocks.getMyBalance.mockRejectedValue(new Error('余额汇总加载失败'))

    mountPage()
    await nextTick()
    await flushPromises()

    expect(ElMessage.error).toHaveBeenCalledWith('余额汇总加载失败')
  })

  it('warns when withdraw amount is missing', async () => {
    authApiMocks.getMyBalance.mockResolvedValue({ balance: 5000 })
    const wrapper = mountPage()
    await nextTick()
    await flushPromises()

    await (wrapper.vm as { submit: () => Promise<void> }).submit()

    expect(ElMessage.warning).toHaveBeenCalledWith('请输入金额')
    expect(authApiMocks.withdraw).not.toHaveBeenCalled()
  })

  it('warns when balance is insufficient', async () => {
    authApiMocks.getMyBalance.mockResolvedValue({ balance: 5000 })
    const wrapper = mountPage()
    await nextTick()
    await flushPromises()

    ;(wrapper.vm as { amount: number }).amount = 60
    await (wrapper.vm as { submit: () => Promise<void> }).submit()

    expect(ElMessage.warning).toHaveBeenCalledWith('余额不足')
    expect(authApiMocks.withdraw).not.toHaveBeenCalled()
  })

  it('submits withdraw request and returns on success', async () => {
    authApiMocks.getMyBalance.mockResolvedValue({ balance: 5000 })
    authApiMocks.withdraw.mockResolvedValue({ ok: true })
    const wrapper = mountPage()
    await nextTick()
    await flushPromises()

    ;(wrapper.vm as { amount: number }).amount = 20
    await (wrapper.vm as { submit: () => Promise<void> }).submit()

    expect(authApiMocks.withdraw).toHaveBeenCalledWith(2000)
    expect(ElMessage.success).toHaveBeenCalledWith('提现申请已提交')
    expect(routerBack).toHaveBeenCalled()
  })
})
