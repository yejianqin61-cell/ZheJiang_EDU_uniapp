import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { AlipayProvider } from './alipay.provider'

const { generateKeyPairSync } = require('crypto')
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })

describe('AlipayProvider', () => {
  let provider: AlipayProvider
  let configGet: jest.Mock

  const mockOrder = {
    orderNo: '20260617001', outTradeNo: 'OUT-20260617001', amount: 4000,
    paperTitle: '五年级数学单元练习卷', paperId: 'paper-1', userId: 'user-1',
  } as any

  beforeEach(async () => {
    configGet = jest.fn((key: string) => {
      const vals: Record<string, string> = {
        'alipay.appId': '20210001',
        'alipay.privateKey': privateKey,
        'alipay.alipayPublicKey': publicKey,
        'alipay.notifyUrl': 'https://test.com/v1/payment/alipay/callback',
        'alipay.returnUrl': 'https://test.com/orders',
      }
      return vals[key] ?? ''
    })
    const m: TestingModule = await Test.createTestingModule({
      providers: [AlipayProvider, { provide: ConfigService, useValue: { get: configGet } }],
    }).compile()
    provider = m.get(AlipayProvider)
  })

  it('name 为 alipay', () => expect(provider.name).toBe('alipay'))
  it('displayName 为 支付宝', () => expect(provider.displayName).toBe('支付宝'))

  it('isAvailable — 配置了 AppID 时返回 true', () => {
    expect(provider.isAvailable()).toBe(true)
  })

  it('createPayment — 生成支付宝 HTML 表单', async () => {
    const result = await provider.createPayment({
      outTradeNo: mockOrder.outTradeNo,
      amount: mockOrder.amount,
      subject: mockOrder.paperTitle,
    })
    expect(result.provider).toBe('alipay')
    expect(result.payForm).toContain('<form')
    expect(result.payForm).toContain('alipay.trade.page.pay')
    expect(result.amount).toBe(4000)
  })

  it('createPayment — timestamp uses yyyy-MM-dd HH:mm:ss format', async () => {
    const result = await provider.createPayment({
      outTradeNo: mockOrder.outTradeNo,
      amount: mockOrder.amount,
      subject: mockOrder.paperTitle,
    })

    const matched = result.payForm?.match(/name="timestamp" value="([^"]+)"/)
    expect(matched?.[1]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  it('verifyCallback — 无效签名应抛出异常', async () => {
    const badData = { out_trade_no: 'X', trade_no: 'Y', total_amount: '40', trade_status: 'TRADE_SUCCESS', sign: 'bad', sign_type: 'RSA2' }
    await expect(provider.verifyCallback(badData)).rejects.toThrow()
  })
})
