import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()

vi.doMock('@/api/index', () => ({
  default: { get: mockGet, post: mockPost, put: mockPut, delete: mockDelete },
}))

describe('Address API', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
    mockPut.mockReset()
    mockDelete.mockReset()
  })

  it('listAddresses normalizes array response', async () => {
    const { listAddresses } = await import('@/api/modules/address')
    const payload = [{ id: 'addr-1', receiverName: '张三' }]
    mockGet.mockResolvedValue(payload)

    await expect(listAddresses()).resolves.toEqual(payload)
    expect(mockGet).toHaveBeenCalledWith('/shipping-addresses')
  })

  it('listAddresses normalizes list wrapper response', async () => {
    const { listAddresses } = await import('@/api/modules/address')
    const payload = [{ id: 'addr-2', receiverName: '李四' }]
    mockGet.mockResolvedValue({ list: payload })

    await expect(listAddresses()).resolves.toEqual(payload)
  })

  it('getAddress -> GET /shipping-addresses/:id', async () => {
    const { getAddress } = await import('@/api/modules/address')
    mockGet.mockResolvedValue({ id: 'addr-1' })

    await getAddress('addr-1')

    expect(mockGet).toHaveBeenCalledWith('/shipping-addresses/addr-1')
  })

  it('createAddress -> POST /shipping-addresses', async () => {
    const { createAddress } = await import('@/api/modules/address')
    const payload = {
      receiverName: '张三',
      phone: '13800000000',
      province: '浙江',
      city: '杭州',
      district: '西湖',
      detail: '1号',
      isDefault: true,
    }
    mockPost.mockResolvedValue({ id: 'addr-1' })

    await createAddress(payload)

    expect(mockPost).toHaveBeenCalledWith('/shipping-addresses', payload)
  })

  it('updateAddress -> PUT /shipping-addresses/:id', async () => {
    const { updateAddress } = await import('@/api/modules/address')
    const payload = {
      receiverName: '张三',
      phone: '13800000000',
      province: '浙江',
      city: '杭州',
      district: '西湖',
      detail: '2号',
      isDefault: false,
    }
    mockPut.mockResolvedValue({ ok: true })

    await updateAddress('addr-1', payload)

    expect(mockPut).toHaveBeenCalledWith('/shipping-addresses/addr-1', payload)
  })

  it('deleteAddress -> DELETE /shipping-addresses/:id', async () => {
    const { deleteAddress } = await import('@/api/modules/address')
    mockDelete.mockResolvedValue({ ok: true })

    await deleteAddress('addr-1')

    expect(mockDelete).toHaveBeenCalledWith('/shipping-addresses/addr-1')
  })
})
