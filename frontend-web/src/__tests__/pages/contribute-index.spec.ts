import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ContributeIndexPage from '@/pages/contribute/index.vue'

const routerPush = vi.fn()
const contributionApiMocks = vi.hoisted(() => ({
  listContributions: vi.fn(),
}))
const exerciseApiMocks = vi.hoisted(() => ({
  getMyExerciseUploads: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}))

vi.mock('@/api/modules/contribution', () => ({
  listContributions: contributionApiMocks.listContributions,
}))

vi.mock('@/api/modules/exercise', () => ({
  getMyExerciseUploads: exerciseApiMocks.getMyExerciseUploads,
}))

const mountPage = () =>
  mount(ContributeIndexPage, {
    global: {
      directives: {
        loading: {},
      },
      stubs: {
        'el-tabs': { template: '<div><slot /></div>' },
        'el-tab-pane': { template: '<div><slot /></div>' },
        'el-empty': { props: ['description'], template: '<div>{{ description }}<slot /></div>' },
        'el-button': { template: '<button><slot /></button>' },
        'el-tag': { template: '<span><slot /></span>' },
        'el-table': { template: '<div />' },
        'el-table-column': true,
      },
    },
  })

describe('Contribute index page', () => {
  beforeEach(() => {
    routerPush.mockReset()
    contributionApiMocks.listContributions.mockReset()
    exerciseApiMocks.getMyExerciseUploads.mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('loads question contributions on mount', async () => {
    contributionApiMocks.listContributions.mockResolvedValue([
      { id: 'c1', filename: '数学题库.docx', status: 'pending_review' },
    ])

    const wrapper = mountPage()
    await nextTick()

    expect(contributionApiMocks.listContributions).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('我的贡献')
  })

  it('loads exercise contributions after switching tab', async () => {
    contributionApiMocks.listContributions.mockResolvedValue([])
    exerciseApiMocks.getMyExerciseUploads.mockResolvedValue({
      list: [{ id: 'e1', title: '同步练习', exerciseType: 'sync', status: 'approved', cashbackAmount: 300 }],
    })

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).switchTab('exercise')

    expect(exerciseApiMocks.getMyExerciseUploads).toHaveBeenCalledWith({})
  })

  it('shows empty state for question contributions when list is empty', async () => {
    contributionApiMocks.listContributions.mockResolvedValue([])

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('还没有题库贡献，上传试题获取返现')
  })
})
