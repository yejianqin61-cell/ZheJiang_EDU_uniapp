import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ExerciseDrawPage from '@/pages/exercises/draw.vue'

const routerBack = vi.fn()
const routerPush = vi.fn()
const routeState = vi.hoisted(() => ({
  query: {
    nodeType: 'category' as string | undefined,
    nodeId: 'cat-1' as string | undefined,
  },
}))
const exerciseApiMocks = vi.hoisted(() => ({
  drawCategory: vi.fn(),
  drawLesson: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    back: routerBack,
    push: routerPush,
  }),
}))

vi.mock('@/api/modules/exercise', () => ({
  drawCategory: exerciseApiMocks.drawCategory,
  drawLesson: exerciseApiMocks.drawLesson,
}))

const mountPage = () =>
  mount(ExerciseDrawPage, {
    global: {
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        'el-button': { template: '<button><slot /></button>' },
      },
    },
  })

describe('Exercise draw page', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    routeState.query.nodeType = 'category'
    routeState.query.nodeId = 'cat-1'
    routerBack.mockReset()
    routerPush.mockReset()
    exerciseApiMocks.drawCategory.mockReset()
    exerciseApiMocks.drawLesson.mockReset()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('draws paper by category and navigates to exercise payment and print', async () => {
    exerciseApiMocks.drawCategory.mockResolvedValue({
      id: 'paper-1',
      title: '单元练习卷',
      fileType: 'pdf',
    })

    const wrapper = mountPage()
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(1500)

    expect(exerciseApiMocks.drawCategory).toHaveBeenCalledWith('cat-1')
    expect(wrapper.text()).toContain('单元练习卷')

    await (wrapper.vm as any).goDownload()
    await (wrapper.vm as any).goPrint()

    expect(routerPush).toHaveBeenNthCalledWith(1, '/payment?paperId=paper-1&type=exercise')
    expect(routerPush).toHaveBeenNthCalledWith(2, '/print/checkout?paperId=paper-1')
  })

  it('draws paper by lesson when node type is lesson', async () => {
    routeState.query.nodeType = 'lesson'
    routeState.query.nodeId = 'lesson-8'
    exerciseApiMocks.drawLesson.mockResolvedValue({
      id: 'paper-8',
      title: '同步课时练习',
      fileType: 'docx',
    })

    mountPage()
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(1500)

    expect(exerciseApiMocks.drawLesson).toHaveBeenCalledWith('lesson-8')
  })

  it('shows empty-state message when backend says no papers are available', async () => {
    exerciseApiMocks.drawCategory.mockRejectedValue({
      response: {
        status: 404,
        data: { message: '暂无试卷' },
      },
    })

    const wrapper = mountPage()
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(1500)

    expect(wrapper.text()).toContain('暂无试卷，请联系管理员上传')
  })

  it('shows service error when draw request fails unexpectedly', async () => {
    exerciseApiMocks.drawCategory.mockRejectedValue({
      response: {
        status: 500,
        data: { message: '抽题服务异常' },
      },
    })

    const wrapper = mountPage()
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(1500)

    expect(wrapper.text()).toContain('抽题服务异常')
  })

  it('shows missing-node guidance when draw query is incomplete', async () => {
    routeState.query.nodeId = undefined

    const wrapper = mountPage()
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(1500)

    expect(exerciseApiMocks.drawCategory).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('抽题信息缺失，请返回上一步重新选择')
  })
})
