import { mount, type VueWrapper } from '@vue/test-utils'
import { ElMessage, ElMessageBox, type MessageBoxData } from 'element-plus'
import { nextTick, type ComponentPublicInstance } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminExercisesPage from '@/pages/admin/exercises/index.vue'
import { elInputStub } from '@/__tests__/utils/element-plus-stubs'
import type { ExerciseCategoryCreatePayload } from '@/api/modules/exercise'

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

type CategoryDialogForm = ExerciseCategoryCreatePayload & { id?: string }

type UploadForm = {
  title: string
  categoryId: string
  lessonId: string
  file: File | null
}

type AdminExercisesPageVm = ComponentPublicInstance & {
  grade: string
  subject: string
  dialogForm: CategoryDialogForm
  uploadForm: UploadForm
  loadAll(): Promise<void>
  saveCat(): Promise<void>
  openNewLesson(unitId: string): Promise<void>
  delCat(id: string): Promise<void>
  doUpload(): Promise<void>
}

const getPageVm = (wrapper: VueWrapper<ComponentPublicInstance>) => wrapper.vm as AdminExercisesPageVm

const buildPromptResult = (value: string): MessageBoxData => ({
  value,
  action: 'confirm',
})

const buildDialogForm = (overrides: Partial<CategoryDialogForm> = {}): CategoryDialogForm => ({
  type: 'unit',
  grade: '五年级',
  subject: '数学',
  name: '第二单元',
  ...overrides,
})

const buildUploadForm = (overrides: Partial<UploadForm> = {}): UploadForm => ({
  title: '同步练习卷',
  categoryId: 'cat-1',
  lessonId: '',
  file: new File(['demo'], 'exercise.pdf', { type: 'application/pdf' }),
  ...overrides,
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

    await getPageVm(wrapper).loadAll()

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
    const vm = getPageVm(wrapper)
    vm.grade = '五年级'
    vm.subject = '数学'

    await vm.loadAll()
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
    const vm = getPageVm(wrapper)
    vm.grade = '五年级'
    vm.subject = '数学'
    vm.dialogForm = buildDialogForm()

    await vm.saveCat()

    expect(exerciseAdminMocks.adminCreateCategory).toHaveBeenCalledWith({
      type: 'unit',
      grade: '五年级',
      subject: '数学',
      name: '第二单元',
    })
    expect(ElMessage.success).toHaveBeenCalledWith('已保存')
  })

  it('shows error when creating lesson fails', async () => {
    vi.mocked(ElMessageBox.prompt).mockResolvedValue(buildPromptResult('第一课'))
    exerciseAdminMocks.adminCreateLesson.mockRejectedValue(new Error('创建课时失败'))

    const wrapper = mountPage()

    await getPageVm(wrapper).openNewLesson('unit-1')

    expect(ElMessage.error).toHaveBeenCalledWith('创建课时失败')
  })

  it('shows error when deleting category fails', async () => {
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm')
    exerciseAdminMocks.adminDeleteCategory.mockRejectedValue(new Error('删除分类失败'))

    const wrapper = mountPage()

    await getPageVm(wrapper).delCat('cat-1')

    expect(ElMessage.error).toHaveBeenCalledWith('删除分类失败')
  })

  it('warns when upload title or file is missing', async () => {
    const wrapper = mountPage()

    await getPageVm(wrapper).doUpload()

    expect(ElMessage.warning).toHaveBeenCalledWith('请填写标题并选择文件')
    expect(exerciseAdminMocks.adminCreatePaper).not.toHaveBeenCalled()
  })

  it('uploads exercise paper and reloads list', async () => {
    exerciseAdminMocks.adminCreatePaper.mockResolvedValue({ ok: true })
    exerciseAdminMocks.adminListCategories.mockResolvedValue([])
    exerciseAdminMocks.adminListLessons.mockResolvedValue([])
    exerciseAdminMocks.adminListPapers.mockResolvedValue([])

    const wrapper = mountPage()
    const vm = getPageVm(wrapper)
    vm.grade = '五年级'
    vm.subject = '数学'
    vm.uploadForm = buildUploadForm()

    await vm.doUpload()

    expect(exerciseAdminMocks.adminCreatePaper).toHaveBeenCalledTimes(1)
    expect(ElMessage.success).toHaveBeenCalledWith('上传成功')
  })
})
