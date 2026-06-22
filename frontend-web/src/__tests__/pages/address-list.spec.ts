import { mount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AddressListPage from '@/pages/address/list/index.vue'

type AddressListPageVm = {
  del: (id: string) => Promise<void>
}

const routerPush = vi.fn()
const addressApiMocks = vi.hoisted(() => ({
  listAddresses: vi.fn(),
  deleteAddress: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}))

vi.mock('@/api/modules/address', () => ({
  listAddresses: addressApiMocks.listAddresses,
  deleteAddress: addressApiMocks.deleteAddress,
}))

const mountPage = () =>
  mount(AddressListPage, {
    global: {
      stubs: {
        'el-button': { template: '<button><slot /></button>' },
        'el-empty': { props: ['description'], template: '<div>{{ description }}</div>' },
        'el-tag': { template: '<span><slot /></span>' },
      },
    },
  })

describe('Address list page', () => {
  beforeEach(() => {
    routerPush.mockReset()
    addressApiMocks.listAddresses.mockReset()
    addressApiMocks.deleteAddress.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessage.error).mockReset()
    vi.mocked(ElMessageBox.confirm).mockReset()
  })

  function getVm(wrapper: ReturnType<typeof mountPage>) {
    return wrapper.vm as AddressListPageVm
  }

  it('loads address list on mount', async () => {
    addressApiMocks.listAddresses.mockResolvedValue([
      { id: 'a1', receiverName: '张三', phone: '13800000000', province: '浙江', city: '杭州', district: '西湖', detail: '1号', isDefault: true },
    ])

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(addressApiMocks.listAddresses).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('张三')
  })

  it('shows empty state when no address exists', async () => {
    addressApiMocks.listAddresses.mockResolvedValue([])

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('暂无收货地址')
  })

  it('shows error when loading addresses fails', async () => {
    addressApiMocks.listAddresses.mockRejectedValue(new Error('地址服务异常'))

    mountPage()
    await nextTick()
    await nextTick()

    expect(ElMessage.error).toHaveBeenCalledWith('地址服务异常')
  })

  it('deletes address and refreshes list after confirmation', async () => {
    addressApiMocks.listAddresses
      .mockResolvedValueOnce([{ id: 'a1', receiverName: '张三', phone: '13800000000', province: '浙江', city: '杭州', district: '西湖', detail: '1号', isDefault: false }])
      .mockResolvedValueOnce([])
    addressApiMocks.deleteAddress.mockResolvedValue({ ok: true })
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm')

    const wrapper = mountPage()
    await nextTick()

    await getVm(wrapper).del('a1')

    expect(addressApiMocks.deleteAddress).toHaveBeenCalledWith('a1')
    expect(ElMessage.success).toHaveBeenCalledWith('已删除')
    expect(addressApiMocks.listAddresses).toHaveBeenCalledTimes(2)
  })

  it('shows error when deleting address fails', async () => {
    addressApiMocks.listAddresses.mockResolvedValue([])
    addressApiMocks.deleteAddress.mockRejectedValue(new Error('删除失败'))
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm')

    const wrapper = mountPage()
    await nextTick()

    await getVm(wrapper).del('a1')

    expect(ElMessage.error).toHaveBeenCalledWith('删除失败')
  })
})
