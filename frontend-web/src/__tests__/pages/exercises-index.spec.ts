import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExercisesIndex from '@/pages/exercises/index.vue'

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}))

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

    ;(wrapper.vm as any).grade = '五年级'
    ;(wrapper.vm as any).subject = '数学'
    ;(wrapper.vm as any).tab = 'unit'

    await (wrapper.vm as any).goNext()

    expect(push).toHaveBeenCalledWith('/exercises/category?type=unit&grade=五年级&subject=数学')
  })
})
