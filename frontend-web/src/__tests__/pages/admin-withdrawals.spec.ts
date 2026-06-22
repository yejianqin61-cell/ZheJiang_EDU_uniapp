import { mount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminWithdrawalsPage from '@/pages/admin/withdrawals/index.vue'

const adminApiMocks = vi.hoisted(() => ({
  getWithdrawals: vi.fn(),
  approveWithdrawal: vi.fn(),
  rejectWithdrawal: vi.fn(),
}))

vi.mock('@/api/modules/admin', () => ({
  getWithdrawals: adminApiMocks.getWithdrawals,
  approveWithdrawal: adminApiMocks.approveWithdrawal,
  rejectWithdrawal: adminApiMocks.rejectWithdrawal,
}))

const mountPage = () =>
  mount(AdminWithdrawalsPage, {
    global: {
      directives: {
        loading: {},
      },
      stubs: {
        'el-table': { template: '<div />' },
        'el-table-column': true,
        'el-tag': { template: '<span><slot /></span>' },
        'el-button': { template: '<button><slot /></button>' },
        'el-pagination': true,
      },
    },
  })

describe('Admin withdrawals page', () => {
  beforeEach(() => {
    adminApiMocks.getWithdrawals.mockReset()
    adminApiMocks.approveWithdrawal.mockReset()
    adminApiMocks.rejectWithdrawal.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
    vi.mocked(ElMessageBox.prompt).mockReset()
  })

  it('loads withdrawal list on mount', async () => {
    adminApiMocks.getWithdrawals.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    })

    mountPage()
    await nextTick()

    expect(adminApiMocks.getWithdrawals).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
    })
  })

  it('approves withdrawal and refreshes list', async () => {
    adminApiMocks.getWithdrawals
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
    adminApiMocks.approveWithdrawal.mockResolvedValue({ ok: true })

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).approve('wd-1')

    expect(adminApiMocks.approveWithdrawal).toHaveBeenCalledWith('wd-1')
    expect(ElMessage.success).toHaveBeenCalledWith('已通过')
    expect(adminApiMocks.getWithdrawals).toHaveBeenCalledTimes(2)
  })

  it('rejects withdrawal with reason and refreshes list', async () => {
    adminApiMocks.getWithdrawals
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
    adminApiMocks.rejectWithdrawal.mockResolvedValue({ ok: true })
    vi.mocked(ElMessageBox.prompt).mockResolvedValue({ value: '资料不完整' } as any)

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).reject('wd-1')

    expect(adminApiMocks.rejectWithdrawal).toHaveBeenCalledWith('wd-1', '资料不完整')
    expect(ElMessage.success).toHaveBeenCalledWith('已拒绝')
    expect(adminApiMocks.getWithdrawals).toHaveBeenCalledTimes(2)
  })
})
