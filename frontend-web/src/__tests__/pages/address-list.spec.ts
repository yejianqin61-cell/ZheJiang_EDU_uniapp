import { mount } from '@vue/test-utils'
import { ElMessage, ElMessageBox } from 'element-plus'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AddressListPage from '@/pages/address/list/index.vue'

const routerPush = vi.fn()
const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}))

vi.mock('@/api/index', () => ({
  default: apiMocks,
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
    apiMocks.get.mockReset()
    apiMocks.delete.mockReset()
    vi.mocked(ElMessage.success).mockReset()
    vi.mocked(ElMessageBox.confirm).mockReset()
  })

  it('loads address list on mount', async () => {
    apiMocks.get.mockResolvedValue([
      { id: 'a1', receiverName: '张三', phone: '13800000000', province: '浙江', city: '杭州', district: '西湖', detail: '1号', isDefault: true },
    ])

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(apiMocks.get).toHaveBeenCalledWith('/shipping-addresses')
    expect(wrapper.text()).toContain('张三')
  })

  it('shows empty state when no address exists', async () => {
    apiMocks.get.mockResolvedValue([])

    const wrapper = mountPage()
    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('暂无收货地址')
  })

  it('deletes address and refreshes list after confirmation', async () => {
    apiMocks.get
      .mockResolvedValueOnce([{ id: 'a1', receiverName: '张三', phone: '13800000000', province: '浙江', city: '杭州', district: '西湖', detail: '1号', isDefault: false }])
      .mockResolvedValueOnce([])
    apiMocks.delete.mockResolvedValue({ ok: true })
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm' as any)

    const wrapper = mountPage()
    await nextTick()

    await (wrapper.vm as any).del('a1')

    expect(apiMocks.delete).toHaveBeenCalledWith('/shipping-addresses/a1')
    expect(ElMessage.success).toHaveBeenCalledWith('已删除')
    expect(apiMocks.get).toHaveBeenCalledTimes(2)
  })
})
