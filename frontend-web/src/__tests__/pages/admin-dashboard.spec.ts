import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminDashboardPage from '@/pages/admin/dashboard/index.vue'

const chartMocks = vi.hoisted(() => ({
  resizeSpy: vi.fn(),
  disposeSpy: vi.fn(),
  chartSetOption: vi.fn(),
  chartInit: vi.fn(),
}))
const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('echarts/core', () => ({
  use: vi.fn(),
  init: chartMocks.chartInit,
}))

vi.mock('@/api/index', () => ({
  default: apiMocks,
}))

vi.mock('@/api/modules/admin', () => ({
  getDashboardStats: apiMocks.get,
}))

const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

const mountPage = () =>
  mount(AdminDashboardPage, {
    attachTo: document.body,
    global: {
      directives: {
        loading: {},
      },
      stubs: {
        'el-row': { template: '<div><slot /></div>' },
        'el-col': { template: '<div><slot /></div>' },
      },
    },
  })

describe('Admin dashboard page', () => {
  beforeEach(() => {
    apiMocks.get.mockReset()
    chartMocks.chartSetOption.mockReset()
    chartMocks.chartInit.mockReset()
    chartMocks.resizeSpy.mockReset()
    chartMocks.disposeSpy.mockReset()
    addEventListenerSpy.mockClear()
    removeEventListenerSpy.mockClear()
    chartMocks.chartInit.mockImplementation(() => ({
      setOption: chartMocks.chartSetOption,
      resize: chartMocks.resizeSpy,
      dispose: chartMocks.disposeSpy,
    }))
  })

  it('loads dashboard stats and renders charts', async () => {
    apiMocks.get.mockResolvedValue({
      totalQuestions: 120,
      bySubject: [{ subject: '数学', count: 60 }],
      byGrade: [{ grade: '五年级', count: 40 }],
      byDifficulty: [{ label: '简单', count: 20 }],
      totalKnowledgePoints: 18,
      pendingReview: 3,
      todayOrders: 5,
      pendingPrint: 2,
      exercisePaperCount: 10,
      pendingExerciseReview: 1,
    })

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(apiMocks.get).toHaveBeenCalledTimes(1)
    expect(chartMocks.chartInit).toHaveBeenCalledTimes(3)
    expect(chartMocks.chartSetOption).toHaveBeenCalled()
    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(wrapper.text()).toContain('120')
  })

  it('removes resize listener and disposes charts on unmount', async () => {
    apiMocks.get.mockResolvedValue({
      totalQuestions: 1,
      bySubject: [],
      byGrade: [],
      byDifficulty: [],
      totalKnowledgePoints: 0,
      pendingReview: 0,
      todayOrders: 0,
      pendingPrint: 0,
      exercisePaperCount: 0,
      pendingExerciseReview: 0,
    })

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    wrapper.unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(chartMocks.disposeSpy).toHaveBeenCalledTimes(3)
  })
})
