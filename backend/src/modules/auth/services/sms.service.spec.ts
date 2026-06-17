import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { SmsService } from './sms.service'
import { BadRequestException, HttpException } from '@nestjs/common'

describe('SmsService', () => {
  let service: SmsService
  let configGet: jest.Mock

  beforeEach(async () => {
    configGet = jest.fn().mockReturnValue('')
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmsService, { provide: ConfigService, useValue: { get: configGet } }],
    }).compile()
    service = module.get(SmsService)
  })

  describe('sendCode', () => {
    it('应拒绝无效手机号格式', async () => {
      await expect(service.sendCode('12345')).rejects.toThrow(BadRequestException)
      await expect(service.sendCode('')).rejects.toThrow(BadRequestException)
      await expect(service.sendCode('1380013800')).rejects.toThrow(BadRequestException) // 10位
    })

    it('应接受有效手机号并成功发送（Dev模式）', async () => {
      await expect(service.sendCode('13800138000')).resolves.toBeUndefined()
    })

    it('应在60秒内禁止重复发送', async () => {
      await service.sendCode('13800138000')
      await expect(service.sendCode('13800138000')).rejects.toThrow(HttpException)
    })

    it('60秒后应允许重新发送', async () => {
      // 用反射重置 limitMap 模拟时间流逝
      const limitMap = (service as any).limitMap as Map<string, number>
      await service.sendCode('13800138000')
      limitMap.set('13800138000', Date.now() - 61000) // 61秒前
      await expect(service.sendCode('13800138000')).resolves.toBeUndefined()
    })
  })

  describe('verifyCode', () => {
    it('未发送验证码时校验应失败', () => {
      expect(() => service.verifyCode('13800138000', '000000')).toThrow(BadRequestException)
    })

    it('正确验证码应通过', async () => {
      const codeMap = (service as any).codeMap as Map<string, any>
      // 手动注入验证码
      codeMap.set('13800138000', { code: '123456', expires: Date.now() + 300000 })
      expect(service.verifyCode('13800138000', '123456')).toBe(true)
    })

    it('错误验证码应失败', async () => {
      const codeMap = (service as any).codeMap as Map<string, any>
      codeMap.set('13800138000', { code: '123456', expires: Date.now() + 300000 })
      expect(() => service.verifyCode('13800138000', '000000')).toThrow(BadRequestException)
    })

    it('过期验证码应失败', async () => {
      const codeMap = (service as any).codeMap as Map<string, any>
      codeMap.set('13800138000', { code: '123456', expires: Date.now() - 1 })
      expect(() => service.verifyCode('13800138000', '123456')).toThrow(BadRequestException)
    })
  })
})
