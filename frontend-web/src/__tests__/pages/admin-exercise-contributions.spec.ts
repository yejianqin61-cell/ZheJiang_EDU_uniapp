import { mount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
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

describe('Admin exercise contributions page', () => {
  beforeEach(() => {
    exerciseAdminMocks.adminListExerciseUploads.mockReset()
    exerciseAdminMocks.adminApproveExerciseUpload.mockReset()
    exerciseAdminMocks.adminRejectExerciseUpload.mockReset()
    exerciseAdminMocks.adminBatchExerciseUploads.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.warning).mockReset()
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

  it('approves a single upload and refreshes list', async () => {
    exerciseAdminMocks.adminListExerciseUploads.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    })
    exerciseAdminMocks.adminApproveExerciseUpload.mockResolvedValue({ paperId: 'p1' })

    const wrapper = mountPage()

    await (wrapper.vm as any).approveOne('upload-1')

    expect(exerciseAdminMocks.adminApproveExerciseUpload).toHaveBeenCalledWith('upload-1')
    expect(ElMessage.success).toHaveBeenCalledWith('已通过')
    expect(exerciseAdminMocks.adminListExerciseUploads).toHaveBeenCalledTimes(2)
  })

  it('warns when batch action is triggered without selection', async () => {
    exerciseAdminMocks.adminListExerciseUploads.mockResolvedValue({
      list: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    })

    const wrapper = mountPage()

    await (wrapper.vm as any).batchAction('approve')

    expect(ElMessage.warning).toHaveBeenCalledWith('请先选择')
    expect(exerciseAdminMocks.adminBatchExerciseUploads).not.toHaveBeenCalled()
  })
})
