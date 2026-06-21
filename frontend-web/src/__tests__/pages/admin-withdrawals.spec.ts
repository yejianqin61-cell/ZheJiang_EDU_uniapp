import { mount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminWithdrawalsPage from '@/pages/admin/withdrawals/index.vue'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
}))

vi.mock('@/api/index', () => ({
  default: apiMocks,
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
    apiMocks.get.mockReset()
    apiMocks.put.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
    vi.mocked(ElMessageBox.prompt).mockReset()
  })

  it('loads withdrawal list on mount', async () => {
    apiMocks.get.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    })

    mountPage()
    await nextTick()

    expect(apiMocks.get).toHaveBeenCalledWith('/admin/withdrawals', {
      params: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    })
  })

  it('approves withdrawal and refreshes list', async () => {
    apiMocks.get
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
    apiMocks.put.mockResolvedValue({ ok: true })

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).approve('wd-1')

    expect(apiMocks.put).toHaveBeenCalledWith('/admin/withdrawals/wd-1', { action: 'approve' })
    expect(ElMessage.success).toHaveBeenCalledWith('已通过')
    expect(apiMocks.get).toHaveBeenCalledTimes(2)
  })

  it('rejects withdrawal with reason and refreshes list', async () => {
    apiMocks.get
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } })
      .mockResolvedValueOnce({ list: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
    apiMocks.put.mockResolvedValue({ ok: true })
    vi.mocked(ElMessageBox.prompt).mockResolvedValue({ value: '资料不完整' } as any)

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).reject('wd-1')

    expect(apiMocks.put).toHaveBeenCalledWith('/admin/withdrawals/wd-1', {
      action: 'reject',
      rejectReason: '资料不完整',
    })
    expect(ElMessage.success).toHaveBeenCalledWith('已拒绝')
    expect(apiMocks.get).toHaveBeenCalledTimes(2)
  })
})
