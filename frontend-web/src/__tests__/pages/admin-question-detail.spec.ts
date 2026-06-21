import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminQuestionDetailPage from '@/pages/admin/questions/detail/index.vue'

const routerBack = vi.fn()
const routeState = vi.hoisted(() => ({
  params: { id: 'question-1' },
}))
const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    back: routerBack,
  }),
}))

vi.mock('@/api/index', () => ({
  default: apiMocks,
}))

vi.mock('@/composables/useMarkdown', () => ({
  renderMarkdown: (content: string) => content,
}))

const mountPage = () =>
  mount(AdminQuestionDetailPage, {
    global: {
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        'el-tag': { template: '<span><slot /></span>' },
        'el-button': { template: '<button><slot /></button>' },
      },
    },
  })

describe('Admin question detail page', () => {
  beforeEach(() => {
    routerBack.mockReset()
    apiMocks.get.mockReset()
    apiMocks.delete.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('loads question detail on mount', async () => {
    apiMocks.get.mockResolvedValue({
      type: '选择题',
      difficulty: '2',
      subject: '数学',
      grade: '五年级',
      content: '题目内容',
      answer: 'B',
      sourceFile: { filename: 'sample.docx' },
    })

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(apiMocks.get).toHaveBeenCalledWith('/admin/questions/question-1')
    expect(wrapper.text()).toContain('题目内容')
    expect(wrapper.text()).toContain('sample.docx')
  })

  it('deletes question and returns to previous page', async () => {
    apiMocks.get.mockResolvedValue({ content: '题目内容' })
    apiMocks.delete.mockResolvedValue({ ok: true })

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).del()

    expect(apiMocks.delete).toHaveBeenCalledWith('/admin/questions/question-1')
    expect(ElMessage.success).toHaveBeenCalledWith('已删除')
    expect(routerBack).toHaveBeenCalled()
  })
})
