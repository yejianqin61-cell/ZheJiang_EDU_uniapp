import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExercisePapersPage from '@/pages/exercises/papers/index.vue'

const routerPush = vi.fn()
const routeState = vi.hoisted(() => ({
  query: {
    categoryId: 'cat-1' as string | undefined,
    lessonId: undefined as string | undefined,
    nodeName: '第一单元',
  },
}))
const exerciseApiMocks = vi.hoisted(() => ({
  getPapersByCategory: vi.fn(),
  getPapersByLesson: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
  useRoute: () => routeState,
}))

vi.mock('@/api/modules/exercise', () => ({
  getPapersByCategory: exerciseApiMocks.getPapersByCategory,
  getPapersByLesson: exerciseApiMocks.getPapersByLesson,
}))

const mountPage = () =>
  mount(ExercisePapersPage, {
    global: {
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        'el-empty': { props: ['description'], template: '<div>{{ description }}<slot /></div>' },
        'el-button': { template: '<button><slot /></button>' },
      },
    },
  })

describe('Exercise papers page', () => {
  beforeEach(() => {
    routerPush.mockReset()
    routeState.query.categoryId = 'cat-1'
    routeState.query.lessonId = undefined
    routeState.query.nodeName = '第一单元'
    exerciseApiMocks.getPapersByCategory.mockReset()
    exerciseApiMocks.getPapersByLesson.mockReset()
  })

  it('loads papers by category on mount', async () => {
    exerciseApiMocks.getPapersByCategory.mockResolvedValue([
      { id: 'paper-1', title: '同步练习卷', fileType: 'pdf', fileSize: 2048, pageCount: 3 },
    ])

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(exerciseApiMocks.getPapersByCategory).toHaveBeenCalledWith('cat-1')
    expect(wrapper.text()).toContain('同步练习卷')
  })

  it('loads papers by lesson when lesson id exists', async () => {
    routeState.query.categoryId = undefined
    routeState.query.lessonId = 'lesson-1'
    exerciseApiMocks.getPapersByLesson.mockResolvedValue([])

    mountPage()
    await nextTick()

    expect(exerciseApiMocks.getPapersByLesson).toHaveBeenCalledWith('lesson-1')
  })

  it('shows empty state and upload entry when papers are empty', async () => {
    exerciseApiMocks.getPapersByCategory.mockResolvedValue([])

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('暂无试卷')
    expect(wrapper.text()).toContain('上传试卷')
  })

  it('navigates to paper detail page', async () => {
    exerciseApiMocks.getPapersByCategory.mockResolvedValue([])
    const wrapper = mountPage()

    await (wrapper.vm as any).goDetail('paper-9')

    expect(routerPush).toHaveBeenCalledWith('/exercises/papers/paper-9')
  })
})
