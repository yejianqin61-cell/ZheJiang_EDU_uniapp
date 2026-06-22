import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExerciseCategoryPage from '@/pages/exercises/category.vue'

const routerPush = vi.fn()
const routeState = vi.hoisted(() => ({
  query: {
    type: 'unit' as string | undefined,
    grade: '五年级' as string | undefined,
    subject: '数学' as string | undefined,
  },
}))
const exerciseApiMocks = vi.hoisted(() => ({
  getExerciseCategories: vi.fn(),
  getExerciseLessons: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    push: routerPush,
  }),
}))

vi.mock('@/api/modules/exercise', () => ({
  getExerciseCategories: exerciseApiMocks.getExerciseCategories,
  getExerciseLessons: exerciseApiMocks.getExerciseLessons,
}))

const mountPage = () =>
  mount(ExerciseCategoryPage, {
    global: {
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        'el-empty': { props: ['description'], template: '<div>{{ description }}</div>' },
        'el-button': { template: '<button><slot /></button>' },
      },
    },
  })

describe('Exercise category page', () => {
  beforeEach(() => {
    routerPush.mockReset()
    routeState.query.type = 'unit'
    routeState.query.grade = '五年级'
    routeState.query.subject = '数学'
    exerciseApiMocks.getExerciseCategories.mockReset()
    exerciseApiMocks.getExerciseLessons.mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('loads categories on mount', async () => {
    exerciseApiMocks.getExerciseCategories.mockResolvedValue([
      { id: 'cat-1', type: 'unit', grade: '五年级', subject: '数学', name: '第一单元' },
    ])

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(exerciseApiMocks.getExerciseCategories).toHaveBeenCalledWith({
      type: 'unit',
      grade: '五年级',
      subject: '数学',
    })
    expect(wrapper.text()).toContain('第一单元')
  })

  it('shows error when category load fails', async () => {
    exerciseApiMocks.getExerciseCategories.mockRejectedValue(new Error('类目服务异常'))

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(ElMessage.error).toHaveBeenCalledWith('类目服务异常')
    expect(wrapper.text()).toContain('暂无类目')
  })

  it('loads lessons for sync mode and shows lesson error when one unit fails', async () => {
    routeState.query.type = 'sync'
    exerciseApiMocks.getExerciseCategories.mockResolvedValue([
      { id: 'cat-1', type: 'unit', grade: '五年级', subject: '数学', name: '第一单元' },
      { id: 'cat-2', type: 'unit', grade: '五年级', subject: '数学', name: '第二单元' },
    ])
    exerciseApiMocks.getExerciseLessons
      .mockResolvedValueOnce([{ id: 'lesson-1', unitId: 'cat-1', name: '第一课' }])
      .mockRejectedValueOnce(new Error('课时服务异常'))

    const wrapper = mountPage()
    await nextTick()
    await nextTick()
    await nextTick()

    expect(exerciseApiMocks.getExerciseLessons).toHaveBeenNthCalledWith(1, 'cat-1')
    expect(exerciseApiMocks.getExerciseLessons).toHaveBeenNthCalledWith(2, 'cat-2')
    expect(ElMessage.error).toHaveBeenCalledWith('课时服务异常')
    expect(wrapper.text()).toContain('第一课')
    expect(wrapper.text()).toContain('暂无课时')
  })
})
