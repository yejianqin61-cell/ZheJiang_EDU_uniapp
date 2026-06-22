import { mount, type VueWrapper } from '@vue/test-utils'
import { ElMessage, ElMessageBox, type MessageBoxData } from 'element-plus'
import type { ComponentPublicInstance } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminExerciseContributionsPage from '@/pages/admin/exercise-contributions/index.vue'

const exerciseAdminMocks = vi.hoisted(() => ({
  adminListExerciseUploads: vi.fn(),
  adminApproveExerciseUpload: vi.fn(),
  adminRejectExerciseUpload: vi.fn(),
  adminBatchExerciseUploads: vi.fn(),
}))

vi.mock('@/api/modules/exercise', () => ({
  adminListExerciseUploads: exerciseAdminMocks.adminListExerciseUploads,
  adminApproveExerciseUpload: exerciseAdminMocks.adminApproveExerciseUpload,
  adminRejectExerciseUpload: exerciseAdminMocks.adminRejectExerciseUpload,
  adminBatchExerciseUploads: exerciseAdminMocks.adminBatchExerciseUploads,
}))

const mountPage = () =>
  mount(AdminExerciseContributionsPage, {
    global: {
      directives: {
        loading: {},
      },
      stubs: {
        'el-select': { template: '<div><slot /></div>' },
        'el-option': true,
        'el-button': { template: '<button><slot /></button>' },
        'el-table': { template: '<div />' },
        'el-table-column': true,
        'el-tag': { template: '<span><slot /></span>' },
        'el-pagination': true,
      },
    },
  })

type AdminExerciseContributionsVm = ComponentPublicInstance & {
  list: Array<{ id: string }>
  selected: string[]
  approveOne(id: string): Promise<void>
  batchAction(action: 'approve' | 'reject'): Promise<void>
}

const getPageVm = (wrapper: VueWrapper<ComponentPublicInstance>) => wrapper.vm as AdminExerciseContributionsVm

const buildPromptResult = (value: string): MessageBoxData => ({
  value,
  action: 'confirm',
})

describe('Admin exercise contributions page', () => {
  beforeEach(() => {
    exerciseAdminMocks.adminListExerciseUploads.mockReset()
    exerciseAdminMocks.adminApproveExerciseUpload.mockReset()
    exerciseAdminMocks.adminRejectExerciseUpload.mockReset()
    exerciseAdminMocks.adminBatchExerciseUploads.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.error).mockReset()
    vi.mocked(ElMessageBox.confirm).mockReset()
    vi.mocked(ElMessageBox.prompt).mockReset()
  })

  it('loads exercise uploads on mount', async () => {
    exerciseAdminMocks.adminListExerciseUploads.mockResolvedValue({
      list: [{ id: 'u1', title: '练习卷', exerciseType: 'sync', status: 'pending_review' }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    })

    mountPage()

    expect(exerciseAdminMocks.adminListExerciseUploads).toHaveBeenCalled()
  })

  it('shows error and clears list when loading exercise uploads fails', async () => {
    exerciseAdminMocks.adminListExerciseUploads.mockRejectedValue(new Error('练习审核服务异常'))

    const wrapper = mountPage()

    await Promise.resolve()

    expect(ElMessage.error).toHaveBeenCalledWith('练习审核服务异常')
    expect(getPageVm(wrapper).list).toEqual([])
  })

  it('approves a single upload and refreshes list', async () => {
    exerciseAdminMocks.adminListExerciseUploads.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    })
    exerciseAdminMocks.adminApproveExerciseUpload.mockResolvedValue({ paperId: 'p1' })

    const wrapper = mountPage()

    await getPageVm(wrapper).approveOne('upload-1')

    expect(exerciseAdminMocks.adminApproveExerciseUpload).toHaveBeenCalledWith('upload-1')
    expect(ElMessage.success).toHaveBeenCalledWith('已通过')
    expect(exerciseAdminMocks.adminListExerciseUploads).toHaveBeenCalledTimes(2)
  })

  it('shows error when approving a single upload fails', async () => {
    exerciseAdminMocks.adminListExerciseUploads.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    })
    exerciseAdminMocks.adminApproveExerciseUpload.mockRejectedValue(new Error('审核失败'))

    const wrapper = mountPage()

    await getPageVm(wrapper).approveOne('upload-1')

    expect(ElMessage.error).toHaveBeenCalledWith('审核失败')
  })

  it('warns when batch action is triggered without selection', async () => {
    exerciseAdminMocks.adminListExerciseUploads.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    })

    const wrapper = mountPage()

    await getPageVm(wrapper).batchAction('approve')

    expect(ElMessage.warning).toHaveBeenCalledWith('请先选择')
    expect(exerciseAdminMocks.adminBatchExerciseUploads).not.toHaveBeenCalled()
  })

  it('shows error when batch reject fails', async () => {
    exerciseAdminMocks.adminListExerciseUploads.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    })
    exerciseAdminMocks.adminBatchExerciseUploads.mockRejectedValue(new Error('批量审核失败'))
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm')
    vi.mocked(ElMessageBox.prompt).mockResolvedValue(buildPromptResult('内容不合规'))

    const wrapper = mountPage()
    getPageVm(wrapper).selected = ['u1', 'u2']

    await getPageVm(wrapper).batchAction('reject')

    expect(ElMessage.error).toHaveBeenCalledWith('批量审核失败')
  })
})
