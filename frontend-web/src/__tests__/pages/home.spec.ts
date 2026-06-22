import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, type ComponentPublicInstance } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth'
import HomePage from '@/pages/index/index.vue'

const routerPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}))

const mountPage = (pinia = createPinia()) =>
  mount(HomePage, {
    global: {
      plugins: [pinia],
    },
  })

type HomePageVm = ComponentPublicInstance & {
  startPaper(): void
}

const getPageVm = (wrapper: VueWrapper<ComponentPublicInstance>) => wrapper.vm as HomePageVm

describe('Home page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    routerPush.mockReset()
    localStorage.clear()
  })

  it('routes logged-out user to login when starting paper', async () => {
    const wrapper = mountPage()

    getPageVm(wrapper).startPaper()

    expect(routerPush).toHaveBeenCalledWith('/login')
  })

  it('routes logged-in user to paper config', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore()
    auth.token = 'header.payload.signature'

    const wrapper = mountPage(pinia)
    await nextTick()

    getPageVm(wrapper).startPaper()

    expect(routerPush).toHaveBeenCalledWith('/paper/config')
  })
})
