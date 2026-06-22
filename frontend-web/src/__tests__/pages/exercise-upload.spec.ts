import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import ExerciseUploadPage from '@/pages/contribute/exercise-upload/index.vue'
import { elInputStub } from '@/__tests__/utils/element-plus-stubs'
import type { ExerciseCategory, ExerciseLesson } from '@/api/modules/exercise'

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

const globalStubs = {
  'router-link': { template: '<a><slot /></a>' },
  'el-row': { template: '<div><slot /></div>' },
  'el-col': { template: '<div><slot /></div>' },
  'el-select': { template: '<div><slot /></div>' },
  'el-option': true,
  'el-input': elInputStub,
  'el-button': { template: '<button><slot /></button>' },
}

type ExerciseUploadPageVm = {
  exerciseType: 'sync' | 'unit' | 'topic' | 'exam'
  subject: string
  grade: string
  title: string
  categoryId: string
  lessonId: string
  file: File | null
  handleSubmit: () => Promise<void>
}

function mountPage() {
  return mount(ExerciseUploadPage, {
    global: {
      stubs: globalStubs,
    },
  })
}

function createCategory(overrides: Partial<ExerciseCategory> = {}): ExerciseCategory {
  return {
    id: 'cat-1',
    name: '第一单元',
    ...overrides,
  }
}

function createLesson(overrides: Partial<ExerciseLesson> = {}): ExerciseLesson {
  return {
    id: 'lesson-1',
    name: '第一课时',
    ...overrides,
  }
}

describe('Exercise upload page', () => {
  beforeEach(() => {
    push.mockReset()
    exerciseApiMocks.uploadExercisePaper.mockReset()
    exerciseApiMocks.getUploadCategories.mockReset()
    exerciseApiMocks.getUploadLessons.mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('shows warning when required fields are missing', async () => {
    const wrapper = mountPage()

    await (wrapper.vm as ExerciseUploadPageVm).handleSubmit()

    expect(ElMessage.warning).toHaveBeenCalled()
    expect(exerciseApiMocks.uploadExercisePaper).not.toHaveBeenCalled()
  })

  it('uploads exercise paper and redirects on success', async () => {
    exerciseApiMocks.uploadExercisePaper.mockResolvedValue({ id: 'upload-1' })
    const wrapper = mountPage()

    ;(wrapper.vm as ExerciseUploadPageVm).subject = '数学'
    ;(wrapper.vm as ExerciseUploadPageVm).grade = '五年级'
    ;(wrapper.vm as ExerciseUploadPageVm).title = '五年级数学同步练习'
    ;(wrapper.vm as ExerciseUploadPageVm).categoryId = 'cat-1'
    ;(wrapper.vm as ExerciseUploadPageVm).file = new File(['demo'], 'exercise.pdf', { type: 'application/pdf' })

    await (wrapper.vm as ExerciseUploadPageVm).handleSubmit()

    expect(exerciseApiMocks.uploadExercisePaper).toHaveBeenCalledTimes(1)
    expect(ElMessage.success).toHaveBeenCalledWith('上传成功，等待管理员审核')
    expect(push).toHaveBeenCalledWith('/contribute')
  })

  it('shows error when categories fail to load', async () => {
    exerciseApiMocks.getUploadCategories.mockRejectedValue(new Error('类目接口异常'))
    const wrapper = mountPage()

    ;(wrapper.vm as ExerciseUploadPageVm).subject = '数学'
    ;(wrapper.vm as ExerciseUploadPageVm).grade = '五年级'
    await nextTick()
    await Promise.resolve()

    expect(ElMessage.error).toHaveBeenCalledWith('类目接口异常')
  })

  it('shows fallback when categories fail without message', async () => {
    exerciseApiMocks.getUploadCategories.mockRejectedValue({ code: 500 })
    const wrapper = mountPage()

    ;(wrapper.vm as ExerciseUploadPageVm).subject = '数学'
    ;(wrapper.vm as ExerciseUploadPageVm).grade = '五年级'
    await nextTick()
    await Promise.resolve()

    expect(ElMessage.error).toHaveBeenCalledWith('类目加载失败')
  })

  it('shows error when lessons fail to load', async () => {
    exerciseApiMocks.getUploadCategories.mockResolvedValue([createCategory()])
    exerciseApiMocks.getUploadLessons.mockRejectedValue(new Error('课时接口异常'))
    const wrapper = mountPage()

    ;(wrapper.vm as ExerciseUploadPageVm).exerciseType = 'sync'
    ;(wrapper.vm as ExerciseUploadPageVm).subject = '数学'
    ;(wrapper.vm as ExerciseUploadPageVm).grade = '五年级'
    await nextTick()
    await Promise.resolve()

    ;(wrapper.vm as ExerciseUploadPageVm).categoryId = 'cat-1'
    await nextTick()
    await Promise.resolve()

    expect(ElMessage.error).toHaveBeenCalledWith('课时接口异常')
  })

  it('shows fallback when lessons fail without message', async () => {
    exerciseApiMocks.getUploadCategories.mockResolvedValue([createCategory()])
    exerciseApiMocks.getUploadLessons.mockRejectedValue({ code: 500 })
    const wrapper = mountPage()

    ;(wrapper.vm as ExerciseUploadPageVm).exerciseType = 'sync'
    ;(wrapper.vm as ExerciseUploadPageVm).subject = '数学'
    ;(wrapper.vm as ExerciseUploadPageVm).grade = '五年级'
    await nextTick()
    await Promise.resolve()

    ;(wrapper.vm as ExerciseUploadPageVm).categoryId = 'cat-1'
    await nextTick()
    await Promise.resolve()

    expect(ElMessage.error).toHaveBeenCalledWith('课时加载失败')
  })

  it('shows error when upload fails', async () => {
    exerciseApiMocks.uploadExercisePaper.mockRejectedValue(new Error('上传接口异常'))
    const wrapper = mountPage()

    ;(wrapper.vm as ExerciseUploadPageVm).subject = '数学'
    ;(wrapper.vm as ExerciseUploadPageVm).grade = '五年级'
    ;(wrapper.vm as ExerciseUploadPageVm).title = '五年级数学同步练习'
    ;(wrapper.vm as ExerciseUploadPageVm).categoryId = 'cat-1'
    ;(wrapper.vm as ExerciseUploadPageVm).file = new File(['demo'], 'exercise.pdf', { type: 'application/pdf' })

    await (wrapper.vm as ExerciseUploadPageVm).handleSubmit()

    expect(ElMessage.error).toHaveBeenCalledWith('上传接口异常')
  })

  it('shows fallback when upload fails without message', async () => {
    exerciseApiMocks.uploadExercisePaper.mockRejectedValue({ code: 500 })
    const wrapper = mountPage()

    ;(wrapper.vm as ExerciseUploadPageVm).subject = '数学'
    ;(wrapper.vm as ExerciseUploadPageVm).grade = '五年级'
    ;(wrapper.vm as ExerciseUploadPageVm).title = '五年级数学同步练习'
    ;(wrapper.vm as ExerciseUploadPageVm).categoryId = 'cat-1'
    ;(wrapper.vm as ExerciseUploadPageVm).file = new File(['demo'], 'exercise.pdf', { type: 'application/pdf' })

    await (wrapper.vm as ExerciseUploadPageVm).handleSubmit()

    expect(ElMessage.error).toHaveBeenCalledWith('上传失败')
  })
})
