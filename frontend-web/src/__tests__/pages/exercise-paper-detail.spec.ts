import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExercisePaperDetailPage from '@/pages/exercises/paper-detail/index.vue'

type ExercisePaperDetailPageVm = {
  goDownload: () => void
  goPrint: () => void
}

const routerBack = vi.fn()
const routerPush = vi.fn()
const routeState = vi.hoisted(() => ({
  params: { id: 'paper-1' as string | undefined },
}))
const exerciseApiMocks = vi.hoisted(() => ({
  getPaperDetail: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    back: routerBack,
    push: routerPush,
  }),
  useRoute: () => routeState,
}))

vi.mock('@/api/modules/exercise', () => ({
  getPaperDetail: exerciseApiMocks.getPaperDetail,
}))

const mountPage = () =>
  mount(ExercisePaperDetailPage, {
    global: {
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        'el-button': { template: '<button><slot /></button>' },
      },
    },
  })

describe('Exercise paper detail page', () => {
  beforeEach(() => {
    routerBack.mockReset()
    routerPush.mockReset()
    routeState.params.id = 'paper-1'
    exerciseApiMocks.getPaperDetail.mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  function getVm(wrapper: ReturnType<typeof mountPage>) {
    return wrapper.vm as ExercisePaperDetailPageVm
  }

  it('returns back when paper id is missing', async () => {
    routeState.params.id = undefined

    mountPage()
    await nextTick()

    expect(routerBack).toHaveBeenCalled()
  })

  it('loads exercise paper detail on mount', async () => {
    exerciseApiMocks.getPaperDetail.mockResolvedValue({
      id: 'paper-1',
      title: '同步练习卷',
      fileType: 'pdf',
      fileSize: 4096,
      pageCount: 4,
      thumbnailUrl: 'https://example.com/thumb.png',
    })

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(exerciseApiMocks.getPaperDetail).toHaveBeenCalledWith('paper-1')
    expect(wrapper.text()).toContain('同步练习卷')
  })

  it('navigates to exercise payment and print checkout', async () => {
    exerciseApiMocks.getPaperDetail.mockResolvedValue({
      id: 'paper-8',
      title: '单元练习卷',
      fileType: 'docx',
    })

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    getVm(wrapper).goDownload()
    getVm(wrapper).goPrint()

    expect(routerPush).toHaveBeenNthCalledWith(1, '/payment?paperId=paper-8&type=exercise')
    expect(routerPush).toHaveBeenNthCalledWith(2, '/print/checkout?paperId=paper-8')
  })

  it('shows error when loading exercise paper detail fails', async () => {
    exerciseApiMocks.getPaperDetail.mockRejectedValue(new Error('练习试卷详情服务异常'))

    mountPage()
    await nextTick()
    await nextTick()

    expect(ElMessage.error).toHaveBeenCalledWith('练习试卷详情服务异常')
  })
})
