import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { ShippingAddressService } from './shipping-address.service'
import { ShippingAddress } from '../../../database/entities/shipping-address.entity'

describe('ShippingAddressService', () => {
  let service: ShippingAddressService
  let repo: any

  function makeAddr(overrides = {}) {
    return { id: 'addr-1', userId: 'user-1', receiverName: '张三', phone: '13800138000', province: '浙江省', city: '杭州市', district: '西湖区', detail: '文三路138号', isDefault: false, ...overrides }
  }
  let mockAddr = makeAddr()

  beforeEach(async () => {
    mockAddr = makeAddr() // fresh copy
    repo = {
      find: jest.fn().mockResolvedValue([mockAddr]),
      findOne: jest.fn().mockResolvedValue(mockAddr),
      count: jest.fn().mockResolvedValue(1),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e.id ? e : { id: 'new-id', ...e })),
      create: jest.fn().mockImplementation((d) => ({ id: 'new-id', ...d })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    }
    const m: TestingModule = await Test.createTestingModule({
      providers: [ShippingAddressService, { provide: getRepositoryToken(ShippingAddress), useValue: repo }],
    }).compile()
    service = m.get(ShippingAddressService)
  })

  it('listByUser — 返回用户地址列表', async () => {
    const r = await service.listByUser('user-1')
    expect(r).toHaveLength(1)
    expect(r[0].receiverName).toBe('张三')
  })

  it('getById — 成功返回地址', async () => {
    const r = await service.getById('addr-1', 'user-1')
    expect(r.receiverName).toBe('张三')
  })

  it('getById — 地址不存在抛出 NotFound', async () => {
    repo.findOne.mockResolvedValue(null)
    await expect(service.getById('bad-id', 'user-1')).rejects.toThrow(NotFoundException)
  })

  it('getById — 无权访问他人地址抛出 Forbidden', async () => {
    repo.findOne.mockResolvedValue({ ...mockAddr, userId: 'other-user' })
    await expect(service.getById('addr-1', 'user-1')).rejects.toThrow(ForbiddenException)
  })

  it('create — 创建地址返回 id', async () => {
    const r = await service.create('user-1', { receiverName: '李四', phone: '13900139000', province: '浙江省', city: '杭州市', district: '西湖区', detail: '浙大路38号' })
    expect(r.id).toBeDefined()
  })

  it('create — 超过10个地址应拒绝', async () => {
    repo.count.mockResolvedValue(10)
    await expect(service.create('user-1', { receiverName: '李四', phone: '13900139000', province: '浙江省', city: '杭州市', district: '西湖区', detail: '浙大路38号' })).rejects.toThrow(BadRequestException)
  })

  it('update — 可更新自己的地址', async () => {
    await expect(service.update('addr-1', 'user-1', { receiverName: '王五' })).resolves.toBeUndefined()
  })

  it('delete — 可删除自己的地址', async () => {
    await expect(service.delete('addr-1', 'user-1')).resolves.toBeUndefined()
  })

  it('snapshot — 返回地址快照', async () => {
    const r = await service.snapshot('addr-1', 'user-1')
    expect(r.receiverName).toBe('张三')
    expect(r.phone).toBe('13800138000')
  })
})
