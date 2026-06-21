import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePaperStore } from '@/stores/paper'
import PaperConfigPage from '@/pages/paper/config/index.vue'

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

describe('Paper config page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    routerPush.mockReset()
    vi.mocked(ElMessage.warning).mockReset()
  })

  it('warns when subject is missing before generate', async () => {
    const wrapper = mountPage()

    await (wrapper.vm as any).handleGenerate()

    expect(ElMessage.warning).toHaveBeenCalledWith('请选择科目')
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('refreshes knowledge points when selecting grade after subject', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const paperStore = usePaperStore()
    const fetchKnowledgePoints = vi.spyOn(paperStore, 'fetchKnowledgePoints').mockResolvedValue(undefined)

    const wrapper = mountPage(pinia)
    ;(wrapper.vm as any).selectSubject('数学')
    ;(wrapper.vm as any).paper.condition.knowledgePointIds = ['kp-old']

    ;(wrapper.vm as any).selectGrade('五年级')
    await nextTick()

    expect((wrapper.vm as any).paper.condition.grade).toBe('五年级')
    expect((wrapper.vm as any).paper.condition.knowledgePointIds).toEqual([])
    expect(fetchKnowledgePoints).toHaveBeenCalledTimes(1)
  })

  it('navigates to preview after successful generate', async () => {
    vi.useFakeTimers()
    const pinia = createPinia()
    setActivePinia(pinia)
    const paperStore = usePaperStore()
    paperStore.condition.subject = '数学'
    paperStore.condition.grade = '五年级'
    paperStore.currentPaper = {
      paperId: 'paper-1',
      title: '测试卷',
      questions: [],
      generateTime: 1,
    } as any
    vi.spyOn(paperStore, 'generate').mockImplementation(async () => {
      paperStore.currentPaper = {
        paperId: 'paper-1',
        title: '测试卷',
        questions: [],
        generateTime: 1,
      } as any
    })

    const wrapper = mountPage(pinia)

    const promise = (wrapper.vm as any).handleGenerate()
    await vi.advanceTimersByTimeAsync(400)
    await promise

    expect((wrapper.vm as any).generating).toBe(false)
    expect(routerPush).toHaveBeenCalledWith('/paper/preview')
    vi.useRealTimers()
  })
})
