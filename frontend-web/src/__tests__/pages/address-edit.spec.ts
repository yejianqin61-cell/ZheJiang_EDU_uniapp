import { mount } from '@vue/test-utils'
import { ElMessage } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AddressEditPage from '@/pages/address/edit/index.vue'
import { elInputStub } from '@/__tests__/utils/element-plus-stubs'
import type { ShippingAddressPayload } from '@/api/modules/address'

const routerBack = vi.fn()
const routeState = vi.hoisted(() => ({
  params: { id: undefined as string | undefined },
}))
const addressApiMocks = vi.hoisted(() => ({
  getAddress: vi.fn(),
  createAddress: vi.fn(),
  updateAddress: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    back: routerBack,
  }),
  useRoute: () => routeState,
}))

vi.mock('@/api/modules/address', () => ({
  getAddress: addressApiMocks.getAddress,
  createAddress: addressApiMocks.createAddress,
  updateAddress: addressApiMocks.updateAddress,
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

type AddressEditPageVm = {
  form: ShippingAddressPayload
  submit: () => Promise<void>
}

function createAddressForm(overrides: Partial<ShippingAddressPayload> = {}): ShippingAddressPayload {
  return {
    receiverName: '张三',
    phone: '13800000000',
    province: '浙江',
    city: '杭州',
    district: '西湖',
    detail: '1号',
    isDefault: false,
    ...overrides,
  }
}

describe('Address edit page', () => {
  beforeEach(() => {
    routeState.params.id = undefined
    routerBack.mockReset()
    addressApiMocks.getAddress.mockReset()
    addressApiMocks.createAddress.mockReset()
    addressApiMocks.updateAddress.mockReset()
    vi.mocked(ElMessage.warning).mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
  })

  it('warns when address form is incomplete', async () => {
    const wrapper = mountPage()

    await (wrapper.vm as AddressEditPageVm).submit()

    expect(ElMessage.warning).toHaveBeenCalledWith('请填写完整地址信息')
    expect(addressApiMocks.createAddress).not.toHaveBeenCalled()
  })

  it('creates address and returns on success', async () => {
    addressApiMocks.createAddress.mockResolvedValue({ ok: true })
    const wrapper = mountPage()
    ;(wrapper.vm as AddressEditPageVm).form = createAddressForm({ isDefault: true })

    await (wrapper.vm as AddressEditPageVm).submit()

    expect(addressApiMocks.createAddress).toHaveBeenCalledWith({
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
    addressApiMocks.getAddress.mockResolvedValue(createAddressForm({
      receiverName: '李四',
      phone: '13900000000',
      city: '宁波',
      district: '海曙',
      detail: '2号',
    }))

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(addressApiMocks.getAddress).toHaveBeenCalledWith('addr-1')
    expect((wrapper.vm as AddressEditPageVm).form.receiverName).toBe('李四')
  })

  it('updates address and returns on success', async () => {
    routeState.params.id = 'addr-2'
    addressApiMocks.getAddress.mockResolvedValue(createAddressForm({
      receiverName: '王五',
      phone: '13700000000',
      city: '绍兴',
      district: '越城',
      detail: '3号',
    }))
    addressApiMocks.updateAddress.mockResolvedValue({ ok: true })

    const wrapper = mountPage()
    await nextTick()
    await nextTick()
    ;(wrapper.vm as AddressEditPageVm).form.detail = '4号'

    await (wrapper.vm as AddressEditPageVm).submit()

    expect(addressApiMocks.updateAddress).toHaveBeenCalledWith('addr-2', {
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

  it('shows error and returns when existing address fails to load', async () => {
    routeState.params.id = 'addr-3'
    addressApiMocks.getAddress.mockRejectedValue({ code: 500 })

    mountPage()
    await nextTick()
    await nextTick()

    expect(ElMessage.error).toHaveBeenCalledWith('保存失败')
    expect(routerBack).toHaveBeenCalled()
  })
})
