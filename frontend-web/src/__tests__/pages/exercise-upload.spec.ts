import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ElMessage } from 'element-plus'
import ExerciseUploadPage from '@/pages/contribute/exercise-upload/index.vue'

const push = vi.fn()
const exerciseApiMocks = vi.hoisted(() => ({
  uploadExercisePaper: vi.fn(),
  getUploadCategories: vi.fn(),
  getUploadLessons: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/api/modules/exercise', () => ({
  uploadExercisePaper: exerciseApiMocks.uploadExercisePaper,
  getUploadCategories: exerciseApiMocks.getUploadCategories,
  getUploadLessons: exerciseApiMocks.getUploadLessons,
}))

describe('Exercise upload page', () => {
  beforeEach(() => {
    push.mockReset()
    exerciseApiMocks.uploadExercisePaper.mockReset()
    exerciseApiMocks.getUploadCategories.mockReset()
    exerciseApiMocks.getUploadLessons.mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.success).mockReset()
  })

  it('shows warning when required fields are missing', async () => {
    const wrapper = mount(ExerciseUploadPage, {
      global: {
        stubs: {
          'router-link': { template: '<a><slot /></a>' },
          'el-row': { template: '<div><slot /></div>' },
          'el-col': { template: '<div><slot /></div>' },
          'el-select': { template: '<div><slot /></div>' },
          'el-option': true,
          'el-input': { template: '<input />' },
          'el-button': { template: '<button><slot /></button>' },
        },
      },
    })

    await (wrapper.vm as any).handleSubmit()

    expect(ElMessage.warning).toHaveBeenCalled()
    expect(exerciseApiMocks.uploadExercisePaper).not.toHaveBeenCalled()
  })

  it('uploads exercise paper and redirects on success', async () => {
    exerciseApiMocks.uploadExercisePaper.mockResolvedValue({ id: 'upload-1' })

    const wrapper = mount(ExerciseUploadPage, {
      global: {
        stubs: {
          'router-link': { template: '<a><slot /></a>' },
          'el-row': { template: '<div><slot /></div>' },
          'el-col': { template: '<div><slot /></div>' },
          'el-select': { template: '<div><slot /></div>' },
          'el-option': true,
          'el-input': { template: '<input />' },
          'el-button': { template: '<button><slot /></button>' },
        },
      },
    })

    ;(wrapper.vm as any).subject = '数学'
    ;(wrapper.vm as any).grade = '五年级'
    ;(wrapper.vm as any).title = '五年级数学同步练习'
    ;(wrapper.vm as any).categoryId = 'cat-1'
    ;(wrapper.vm as any).file = new File(['demo'], 'exercise.pdf', { type: 'application/pdf' })

    await (wrapper.vm as any).handleSubmit()

    expect(exerciseApiMocks.uploadExercisePaper).toHaveBeenCalledTimes(1)
    expect(ElMessage.success).toHaveBeenCalledWith('上传成功，等待管理员审核')
    expect(push).toHaveBeenCalledWith('/contribute')
  })
})
