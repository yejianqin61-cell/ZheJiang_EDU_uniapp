import { mount, type VueWrapper } from '@vue/test-utils'
import type { ComponentPublicInstance } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExercisesIndex from '@/pages/exercises/index.vue'

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}))

type ExercisesIndexVm = ComponentPublicInstance & {
  grade: string
  subject: string
  tab: 'sync' | 'unit' | 'topic' | 'exam'
  goNext(): void
}

const getPageVm = (wrapper: VueWrapper<ComponentPublicInstance>) => wrapper.vm as ExercisesIndexVm

describe('Exercises index page', () => {
  beforeEach(() => {
    push.mockReset()
  })

  it('renders core exercise modes and selection controls', () => {
    const wrapper = mount(ExercisesIndex, {
      global: {
        stubs: {
          'router-link': { template: '<a><slot /></a>' },
          'el-row': { template: '<div><slot /></div>' },
          'el-col': { template: '<div><slot /></div>' },
          'el-select': { template: '<div><slot /></div>' },
          'el-option': true,
          'el-button': { template: '<button><slot /></button>' },
        },
      },
    })

    expect(wrapper.text()).toContain('同步练')
    expect(wrapper.text()).toContain('单元练')
    expect(wrapper.text()).toContain('专题练')
    expect(wrapper.text()).toContain('期中期末')
    expect(wrapper.text()).toContain('选择年级和科目')
  })

  it('navigates to category page when grade and subject are selected', async () => {
    const wrapper = mount(ExercisesIndex, {
      global: {
        stubs: {
          'router-link': { template: '<a><slot /></a>' },
          'el-row': { template: '<div><slot /></div>' },
          'el-col': { template: '<div><slot /></div>' },
          'el-select': { template: '<div><slot /></div>' },
          'el-option': true,
          'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
        },
      },
    })
    const vm = getPageVm(wrapper)

    vm.grade = '五年级'
    vm.subject = '数学'
    vm.tab = 'unit'

    vm.goNext()

    expect(push).toHaveBeenCalledWith('/exercises/category?type=unit&grade=五年级&subject=数学')
  })
})
