import { mount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AddressListPage from '@/pages/address/list/index.vue'

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
    vi.mocked(ElMessageBox.confirm).mockReset()
  })

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

  it('deletes address and refreshes list after confirmation', async () => {
    addressApiMocks.listAddresses
      .mockResolvedValueOnce([{ id: 'a1', receiverName: '张三', phone: '13800000000', province: '浙江', city: '杭州', district: '西湖', detail: '1号', isDefault: false }])
      .mockResolvedValueOnce([])
    addressApiMocks.deleteAddress.mockResolvedValue({ ok: true })
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm' as any)

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).del('a1')

    expect(addressApiMocks.deleteAddress).toHaveBeenCalledWith('a1')
    expect(ElMessage.success).toHaveBeenCalledWith('已删除')
    expect(addressApiMocks.listAddresses).toHaveBeenCalledTimes(2)
  })
})
