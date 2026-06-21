import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AddressEditPage from '@/pages/address/edit/index.vue'
import { elInputStub } from '@/__tests__/utils/element-plus-stubs'

const routerBack = vi.fn()
const routeState = vi.hoisted(() => ({
  params: { id: undefined as string | undefined },
}))
const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    back: routerBack,
  }),
  useRoute: () => routeState,
}))

vi.mock('@/api/index', () => ({
  default: apiMocks,
}))

const mountPage = () =>
  mount(AddressEditPage, {
    global: {
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
        'el-form': { template: '<form><slot /></form>' },
        'el-form-item': { template: '<div><slot /></div>' },
        'el-input': elInputStub,
        'el-row': { template: '<div><slot /></div>' },
        'el-col': { template: '<div><slot /></div>' },
        'el-checkbox': { template: '<input type="checkbox" />' },
        'el-button': { template: '<button><slot /></button>' },
      },
    },
  })

describe('Address edit page', () => {
  beforeEach(() => {
    routeState.params.id = undefined
    routerBack.mockReset()
    apiMocks.get.mockReset()
    apiMocks.post.mockReset()
    apiMocks.put.mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('warns when address form is incomplete', async () => {
    const wrapper = mountPage()

    await (wrapper.vm as any).submit()

    expect(ElMessage.warning).toHaveBeenCalledWith('请填写完整地址信息')
    expect(apiMocks.post).not.toHaveBeenCalled()
  })

  it('creates address and returns on success', async () => {
    apiMocks.post.mockResolvedValue({ ok: true })
    const wrapper = mountPage()
    ;(wrapper.vm as any).form = {
      receiverName: '张三',
      phone: '13800000000',
      province: '浙江',
      city: '杭州',
      district: '西湖',
      detail: '1号',
      isDefault: true,
    }

    await (wrapper.vm as any).submit()

    expect(apiMocks.post).toHaveBeenCalledWith('/shipping-addresses', {
      receiverName: '张三',
      phone: '13800000000',
      province: '浙江',
      city: '杭州',
      district: '西湖',
      detail: '1号',
      isDefault: true,
    })
    expect(ElMessage.success).toHaveBeenCalledWith('已添加')
    expect(routerBack).toHaveBeenCalled()
  })

  it('loads existing address in edit mode', async () => {
    routeState.params.id = 'addr-1'
    apiMocks.get.mockResolvedValue({
      receiverName: '李四',
      phone: '13900000000',
      province: '浙江',
      city: '宁波',
      district: '海曙',
      detail: '2号',
      isDefault: false,
    })

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(apiMocks.get).toHaveBeenCalledWith('/shipping-addresses/addr-1')
    expect((wrapper.vm as any).form.receiverName).toBe('李四')
  })

  it('updates address and returns on success', async () => {
    routeState.params.id = 'addr-2'
    apiMocks.get.mockResolvedValue({
      receiverName: '王五',
      phone: '13700000000',
      province: '浙江',
      city: '绍兴',
      district: '越城',
      detail: '3号',
      isDefault: false,
    })
    apiMocks.put.mockResolvedValue({ ok: true })

    const wrapper = mountPage()
    await nextTick()
    await nextTick()
    ;(wrapper.vm as any).form.detail = '4号'

    await (wrapper.vm as any).submit()

    expect(apiMocks.put).toHaveBeenCalledWith('/shipping-addresses/addr-2', {
      receiverName: '王五',
      phone: '13700000000',
      province: '浙江',
      city: '绍兴',
      district: '越城',
      detail: '4号',
      isDefault: false,
    })
    expect(ElMessage.success).toHaveBeenCalledWith('已更新')
    expect(routerBack).toHaveBeenCalled()
  })
})
