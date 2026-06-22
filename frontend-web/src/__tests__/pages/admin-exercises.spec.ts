import { mount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminExercisesPage from '@/pages/admin/exercises/index.vue'
import { elInputStub } from '@/__tests__/utils/element-plus-stubs'

const exerciseAdminMocks = vi.hoisted(() => ({
  adminListCategories: vi.fn(),
  adminCreateCategory: vi.fn(),
  adminUpdateCategory: vi.fn(),
  adminDeleteCategory: vi.fn(),
  adminListLessons: vi.fn(),
  adminCreateLesson: vi.fn(),
  adminDeleteLesson: vi.fn(),
  adminListPapers: vi.fn(),
  adminCreatePaper: vi.fn(),
  adminDeletePaper: vi.fn(),
}))

vi.mock('@/api/modules/exercise', () => ({
  adminListCategories: exerciseAdminMocks.adminListCategories,
  adminCreateCategory: exerciseAdminMocks.adminCreateCategory,
  adminUpdateCategory: exerciseAdminMocks.adminUpdateCategory,
  adminDeleteCategory: exerciseAdminMocks.adminDeleteCategory,
  adminListLessons: exerciseAdminMocks.adminListLessons,
  adminCreateLesson: exerciseAdminMocks.adminCreateLesson,
  adminDeleteLesson: exerciseAdminMocks.adminDeleteLesson,
  adminListPapers: exerciseAdminMocks.adminListPapers,
  adminCreatePaper: exerciseAdminMocks.adminCreatePaper,
  adminDeletePaper: exerciseAdminMocks.adminDeletePaper,
}))

const mountPage = () =>
  mount(AdminExercisesPage, {
    global: {
      stubs: {
        'el-select': { template: '<div><slot /></div>' },
        'el-option': true,
        'el-collapse': { template: '<div><slot /></div>' },
        'el-collapse-item': { template: '<div><slot /></div>' },
        'el-button': { template: '<button><slot /></button>' },
        'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' },
        'el-input': elInputStub,
      },
    },
  })

describe('Admin exercises page', () => {
  beforeEach(() => {
    exerciseAdminMocks.adminListCategories.mockReset()
    exerciseAdminMocks.adminCreateCategory.mockReset()
    exerciseAdminMocks.adminUpdateCategory.mockReset()
    exerciseAdminMocks.adminDeleteCategory.mockReset()
    exerciseAdminMocks.adminListLessons.mockReset()
    exerciseAdminMocks.adminCreateLesson.mockReset()
    exerciseAdminMocks.adminDeleteLesson.mockReset()
    exerciseAdminMocks.adminListPapers.mockReset()
    exerciseAdminMocks.adminCreatePaper.mockReset()
    exerciseAdminMocks.adminDeletePaper.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.error).mockReset()
    vi.mocked(ElMessageBox.confirm).mockReset()
    vi.mocked(ElMessageBox.prompt).mockReset()
  })

  it('does not load exercise data when grade or subject is missing', async () => {
    const wrapper = mountPage()

    await (wrapper.vm as any).loadAll()

    expect(exerciseAdminMocks.adminListCategories).not.toHaveBeenCalled()
  })

  it('loads categories and papers after grade and subject are selected', async () => {
    exerciseAdminMocks.adminListCategories
      .mockResolvedValueOnce([{ id: 'unit-1', name: '第一单元' }])
      .mockResolvedValueOnce([{ id: 'topic-1', name: '计算专题' }])
      .mockResolvedValueOnce([{ id: 'exam-1', name: '期中测试' }])
    exerciseAdminMocks.adminListPapers.mockResolvedValue([])
    exerciseAdminMocks.adminListLessons.mockResolvedValue([])

    const wrapper = mountPage()
    ;(wrapper.vm as any).grade = '五年级'
    ;(wrapper.vm as any).subject = '数学'

    await (wrapper.vm as any).loadAll()
    await nextTick()

    expect(exerciseAdminMocks.adminListCategories).toHaveBeenNthCalledWith(1, {
      grade: '五年级',
      subject: '数学',
      type: 'unit',
    })
    expect(exerciseAdminMocks.adminListCategories).toHaveBeenNthCalledWith(2, {
      grade: '五年级',
      subject: '数学',
      type: 'topic',
    })
    expect(exerciseAdminMocks.adminListCategories).toHaveBeenNthCalledWith(3, {
      grade: '五年级',
      subject: '数学',
      type: 'exam',
    })
  })

  it('creates category and reloads list', async () => {
    exerciseAdminMocks.adminCreateCategory.mockResolvedValue({ id: 'unit-2' })
    exerciseAdminMocks.adminListCategories.mockResolvedValue([])
    exerciseAdminMocks.adminListLessons.mockResolvedValue([])
    exerciseAdminMocks.adminListPapers.mockResolvedValue([])

    const wrapper = mountPage()
    ;(wrapper.vm as any).grade = '五年级'
    ;(wrapper.vm as any).subject = '数学'
    ;(wrapper.vm as any).dialogForm = {
      type: 'unit',
      grade: '五年级',
      subject: '数学',
      name: '第二单元',
    }

    await (wrapper.vm as any).saveCat()

    expect(exerciseAdminMocks.adminCreateCategory).toHaveBeenCalledWith({
      type: 'unit',
      grade: '五年级',
      subject: '数学',
      name: '第二单元',
    })
    expect(ElMessage.success).toHaveBeenCalledWith('已保存')
  })

  it('warns when upload title or file is missing', async () => {
    const wrapper = mountPage()

    await (wrapper.vm as any).doUpload()

    expect(ElMessage.warning).toHaveBeenCalledWith('请填写标题并选择文件')
    expect(exerciseAdminMocks.adminCreatePaper).not.toHaveBeenCalled()
  })

  it('uploads exercise paper and reloads list', async () => {
    exerciseAdminMocks.adminCreatePaper.mockResolvedValue({ ok: true })
    exerciseAdminMocks.adminListCategories.mockResolvedValue([])
    exerciseAdminMocks.adminListLessons.mockResolvedValue([])
    exerciseAdminMocks.adminListPapers.mockResolvedValue([])

    const wrapper = mountPage()
    ;(wrapper.vm as any).grade = '五年级'
    ;(wrapper.vm as any).subject = '数学'
    ;(wrapper.vm as any).uploadForm = {
      title: '同步练习卷',
      categoryId: 'cat-1',
      lessonId: '',
      file: new File(['demo'], 'exercise.pdf', { type: 'application/pdf' }),
    }

    await (wrapper.vm as any).doUpload()

    expect(exerciseAdminMocks.adminCreatePaper).toHaveBeenCalledTimes(1)
    expect(ElMessage.success).toHaveBeenCalledWith('上传成功')
  })
})
