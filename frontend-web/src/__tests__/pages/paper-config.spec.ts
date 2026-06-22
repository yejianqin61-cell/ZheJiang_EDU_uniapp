import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ElMessage } from 'element-plus'
import { nextTick, type ComponentPublicInstance } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePaperStore } from '@/stores/paper'
import PaperConfigPage from '@/pages/paper/config/index.vue'
import type { PaperResult } from '@/types'

const routerPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}))

const mountPage = (pinia = createPinia()) =>
  mount(PaperConfigPage, {
    global: {
      plugins: [pinia],
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        'el-radio-group': { template: '<div><slot /></div>' },
        'el-radio-button': { template: '<button><slot /></button>' },
        'el-slider': true,
        'el-button': { template: '<button><slot /></button>' },
        'el-dialog': { template: '<div><slot /></div>' },
        'el-progress': true,
      },
    },
  })

type PaperConfigPageVm = ComponentPublicInstance & {
  generating: boolean
  handleGenerate(): Promise<void>
  selectGrade(grade: string): void
  selectSubject(subject: string): void
  paper: ReturnType<typeof usePaperStore>
}

const getPageVm = (wrapper: VueWrapper<ComponentPublicInstance>) => wrapper.vm as PaperConfigPageVm

function buildPaperResult(): PaperResult {
  return {
    paperId: 'paper-1',
    title: '测试卷',
    questions: [],
    generateTime: 1,
  }
}

describe('Paper config page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    routerPush.mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('warns when subject is missing before generate', async () => {
    const wrapper = mountPage()

    await getPageVm(wrapper).handleGenerate()

    expect(ElMessage.warning).toHaveBeenCalledWith('请选择科目')
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('refreshes knowledge points when selecting grade after subject', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const paperStore = usePaperStore()
    const fetchKnowledgePoints = vi.spyOn(paperStore, 'fetchKnowledgePoints').mockResolvedValue(undefined)

    const wrapper = mountPage(pinia)
    const vm = getPageVm(wrapper)
    vm.selectSubject('数学')
    vm.paper.condition.knowledgePointIds = ['kp-old']

    vm.selectGrade('五年级')
    await nextTick()

    expect(vm.paper.condition.grade).toBe('五年级')
    expect(vm.paper.condition.knowledgePointIds).toEqual([])
    expect(fetchKnowledgePoints).toHaveBeenCalledTimes(1)
  })

  it('navigates to preview after successful generate', async () => {
    vi.useFakeTimers()
    const pinia = createPinia()
    setActivePinia(pinia)
    const paperStore = usePaperStore()
    paperStore.condition.subject = '数学'
    paperStore.condition.grade = '五年级'
    paperStore.currentPaper = buildPaperResult()
    vi.spyOn(paperStore, 'generate').mockImplementation(async () => {
      paperStore.currentPaper = buildPaperResult()
    })

    const wrapper = mountPage(pinia)
    const vm = getPageVm(wrapper)

    const promise = vm.handleGenerate()
    await vi.advanceTimersByTimeAsync(400)
    await promise

    expect(vm.generating).toBe(false)
    expect(routerPush).toHaveBeenCalledWith('/paper/preview')
    vi.useRealTimers()
  })

  it('shows error when generate fails and stays on config page', async () => {
    vi.useFakeTimers()
    const pinia = createPinia()
    setActivePinia(pinia)
    const paperStore = usePaperStore()
    paperStore.condition.subject = '数学'
    paperStore.condition.grade = '五年级'
    vi.spyOn(paperStore, 'generate').mockRejectedValue(new Error('组卷服务异常'))

    const wrapper = mountPage(pinia)
    const vm = getPageVm(wrapper)

    await vm.handleGenerate()

    expect(ElMessage.error).toHaveBeenCalledWith('组卷服务异常')
    expect(vm.generating).toBe(false)
    expect(routerPush).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
