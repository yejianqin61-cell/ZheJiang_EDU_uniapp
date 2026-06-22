import { mount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ContributeExerciseDetailPage from '@/pages/contribute/exercise-detail/index.vue'

type ContributeExerciseDetailPageVm = {
  handleDelete: () => Promise<void>
}

const routerBack = vi.fn()
const routerReplace = vi.fn()
const routeState = vi.hoisted(() => ({
  params: { id: 'upload-1' as string | undefined },
}))
const exerciseApiMocks = vi.hoisted(() => ({
  getMyExerciseUploadDetail: vi.fn(),
  deleteMyExerciseUpload: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    back: routerBack,
    replace: routerReplace,
  }),
}))

vi.mock('@/api/modules/exercise', () => ({
  getMyExerciseUploadDetail: exerciseApiMocks.getMyExerciseUploadDetail,
  deleteMyExerciseUpload: exerciseApiMocks.deleteMyExerciseUpload,
}))

const mountPage = () =>
  mount(ContributeExerciseDetailPage, {
    global: {
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        'el-tag': { template: '<span><slot /></span>' },
        'el-button': { template: '<button><slot /></button>' },
      },
    },
  })

describe('Contribute exercise detail page', () => {
  beforeEach(() => {
    routeState.params.id = 'upload-1'
    routerBack.mockReset()
    routerReplace.mockReset()
    exerciseApiMocks.getMyExerciseUploadDetail.mockReset()
    exerciseApiMocks.deleteMyExerciseUpload.mockReset()
    vi.mocked(ElMessage.error).mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessageBox.confirm).mockReset()
  })

  function getVm(wrapper: ReturnType<typeof mountPage>) {
    return wrapper.vm as ContributeExerciseDetailPageVm
  }

  it('loads exercise upload detail on mount', async () => {
    exerciseApiMocks.getMyExerciseUploadDetail.mockResolvedValue({
      id: 'upload-1',
      title: '同步练习卷',
      exerciseType: 'sync',
      status: 'pending_review',
      subject: '数学',
      grade: '五年级',
      createdAt: '2026-06-21',
    })

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(exerciseApiMocks.getMyExerciseUploadDetail).toHaveBeenCalledWith('upload-1')
    expect(wrapper.text()).toContain('同步练习卷')
  })

  it('returns back when route id is missing', async () => {
    routeState.params.id = undefined

    mountPage()
    await nextTick()

    expect(routerBack).toHaveBeenCalled()
  })

  it('deletes pending upload after confirmation', async () => {
    exerciseApiMocks.getMyExerciseUploadDetail.mockResolvedValue({
      id: 'upload-1',
      title: '同步练习卷',
      exerciseType: 'sync',
      status: 'pending_review',
      subject: '数学',
      grade: '五年级',
      createdAt: '2026-06-21',
    })
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm')
    exerciseApiMocks.deleteMyExerciseUpload.mockResolvedValue({ ok: true })

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    await getVm(wrapper).handleDelete()

    expect(exerciseApiMocks.deleteMyExerciseUpload).toHaveBeenCalledWith('upload-1')
    expect(ElMessage.success).toHaveBeenCalledWith('已删除')
    expect(routerReplace).toHaveBeenCalledWith('/contribute')
  })
  it('shows error when loading exercise upload detail fails', async () => {
    exerciseApiMocks.getMyExerciseUploadDetail.mockRejectedValue(new Error('练习贡献详情服务异常'))

    mountPage()
    await nextTick()
    await nextTick()

    expect(ElMessage.error).toHaveBeenCalledWith('练习贡献详情服务异常')
  })

  it('shows error when deleting exercise upload fails', async () => {
    exerciseApiMocks.getMyExerciseUploadDetail.mockResolvedValue({
      id: 'upload-1',
      title: 'åŒæ­¥ç»ƒä¹ å·',
      exerciseType: 'sync',
      status: 'pending_review',
      subject: 'æ•°å­¦',
      grade: 'äº”å¹´çº§',
      createdAt: '2026-06-21',
    })
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm')
    exerciseApiMocks.deleteMyExerciseUpload.mockRejectedValue(new Error('删除练习贡献服务异常'))

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    await getVm(wrapper).handleDelete()

    expect(ElMessage.error).toHaveBeenCalledWith('删除练习贡献服务异常')
  })
})
