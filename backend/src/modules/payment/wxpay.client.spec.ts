/**
 * WxPayClient 单元测试 — 微信支付 V3 客户端
 *
 * 覆盖：统一下单、签名验证、回调解密、JSAPI参数构建、平台证书刷新
 *
 * 注意：RSA 签名/验签/AES 解密使用 Node crypto 模块，单元测试 mock crypto
 * 以隔离 OpenSSL 依赖，仅验证逻辑正确性。
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WxPayClient } from './wxpay.client';
import axios from 'axios';
import * as crypto from 'crypto';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock crypto 签名/验签函数，避免依赖真实 RSA 密钥
jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    createSign: jest.fn(),
    createVerify: jest.fn(),
    createDecipheriv: jest.fn(),
    createPublicKey: jest.fn(),
  };
});

function setupCryptoMock() {
  // createSign mock
  const mockSignObj = {
    update: jest.fn().mockReturnThis(),
    sign: jest.fn().mockReturnValue('mock-base64-signature'),
  };
  (crypto.createSign as jest.Mock).mockReturnValue(mockSignObj);

  // createVerify mock
  const mockVerifyObj = {
    update: jest.fn().mockReturnThis(),
    verify: jest.fn().mockReturnValue(true), // default: valid
  };
  (crypto.createVerify as jest.Mock).mockReturnValue(mockVerifyObj);

  // createDecipheriv mock
  const mockDecipher = {
    setAAD: jest.fn().mockReturnThis(),
    setAuthTag: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnValue(Buffer.from('{"trade_state":"SUCCESS"}')),
    final: jest.fn().mockReturnValue(Buffer.from('')),
  };
  (crypto.createDecipheriv as jest.Mock).mockReturnValue(mockDecipher);

  // createPublicKey mock — just return the PEM string as-is
  (crypto.createPublicKey as jest.Mock).mockImplementation((pem: string) => pem);
}

describe('WxPayClient', () => {
  let client: WxPayClient;
  let configGet: jest.Mock;

  // ── Helpers ──
  function createClient(overrides: Record<string, string> = {}) {
    configGet = jest.fn((key: string) => {
      const map: Record<string, string> = {
        'wx.appId': '',
        'wx.mchId': '',
        'wx.apiV3Key': '',
        'wx.mchSerialNo': '',
        'wx.mchPrivateKey': '',
        'wx.payNotifyUrl': '',
        ...overrides,
      };
      return map[key] ?? '';
    });

    return new WxPayClient({ get: configGet } as any);
  }

  beforeEach(() => {
    setupCryptoMock();
  });

  // ═══════════════════════════════════════════════════════════
  // isAvailable
  // ═══════════════════════════════════════════════════════════

  describe('isAvailable', () => {
    it('should return false when no WeChat Pay config', () => {
      client = createClient();
      expect(client.isAvailable).toBe(false);
    });

    it('should return true when all config present', () => {
      client = createClient({
        'wx.appId': 'wx123',
        'wx.mchId': '1234567890',
        'wx.apiV3Key': '0123456789abcdef0123456789abcdef',
        'wx.mchSerialNo': 'SERIAL001',
        'wx.mchPrivateKey': 'mock-private-key-pem',
      });
      expect(client.isAvailable).toBe(true);
    });

    it('should return false when mchId missing but others present', () => {
      client = createClient({
        'wx.appId': 'wx123',
        'wx.apiV3Key': '0123456789abcdef0123456789abcdef',
        'wx.mchSerialNo': 'SERIAL001',
      });
      expect(client.isAvailable).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // unifiedOrder
  // ═══════════════════════════════════════════════════════════

  describe('unifiedOrder', () => {
    const params = {
      outTradeNo: 'OUT20260604001',
      amount: 500,
      description: '五年级数学综合练习卷',
      openid: 'test-openid-abc',
    };

    it('should return mock data in dev mode (no mchId)', async () => {
      client = createClient();

      const result = await client.unifiedOrder(params);

      expect(result.prepayId).toMatch(/^dev_prepay_/);
      expect(result.wxPayParams.paySign).toBe('DEV_MOCK_SIGN');
      expect(result.wxPayParams.timeStamp).toBeDefined();
      expect(result.wxPayParams.nonceStr).toBeDefined();
      expect(result.wxPayParams.package).toMatch(/^prepay_id=/);
      expect(result.wxPayParams.signType).toBe('RSA');
    });

    it('should call WeChat Pay API in production mode', async () => {
      client = createClient({
        'wx.appId': 'wx123',
        'wx.mchId': '1234567890',
        'wx.apiV3Key': '0123456789abcdef0123456789abcdef',
        'wx.mchSerialNo': 'SERIAL001',
        'wx.mchPrivateKey': 'mock-private-key-pem',
        'wx.payNotifyUrl': 'https://example.com/callback',
      });

      mockedAxios.post = jest.fn().mockResolvedValue({
        data: { prepay_id: 'wx_prepay_abc123' },
      });

      const result = await client.unifiedOrder(params);

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const callArgs = mockedAxios.post.mock.calls[0];
      expect(callArgs[0]).toBe('https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi');
      expect(callArgs[2]?.headers?.Authorization).toMatch(/^WECHATPAY2-SHA256-RSA2048/);
      expect(callArgs[2]?.timeout).toBe(15000);

      expect(result.prepayId).toBe('wx_prepay_abc123');
      expect(result.wxPayParams.paySign).toBeDefined();
      expect(result.wxPayParams.paySign).not.toBe('DEV_MOCK_SIGN');
    });

    it('should throw when WeChat Pay does not return prepay_id', async () => {
      client = createClient({
        'wx.appId': 'wx123',
        'wx.mchId': '1234567890',
        'wx.apiV3Key': '0123456789abcdef0123456789abcdef',
        'wx.mchSerialNo': 'SERIAL001',
        'wx.mchPrivateKey': 'mock-private-key-pem',
      });

      mockedAxios.post = jest.fn().mockResolvedValue({ data: {} });

      await expect(client.unifiedOrder(params)).rejects.toThrow('prepay_id');
    });

    it('should throw on network timeout', async () => {
      client = createClient({
        'wx.appId': 'wx123',
        'wx.mchId': '1234567890',
        'wx.apiV3Key': '0123456789abcdef0123456789abcdef',
        'wx.mchSerialNo': 'SERIAL001',
        'wx.mchPrivateKey': 'mock-private-key-pem',
      });

      mockedAxios.post = jest.fn().mockRejectedValue(new Error('ECONNABORTED'));

      await expect(client.unifiedOrder(params)).rejects.toThrow('ECONNABORTED');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // verifySignature
  // ═══════════════════════════════════════════════════════════

  describe('verifySignature', () => {
    const headers = {
      'wechatpay-signature': 'mock-sig-base64',
      'wechatpay-timestamp': '1717500000',
      'wechatpay-nonce': 'abc123def456',
      'wechatpay-serial': 'SERIAL001',
    };

    it('should return true in dev mode', () => {
      client = createClient();
      expect(client.verifySignature(headers, '{}')).toBe(true);
    });

    it('should return false when signature header missing', () => {
      client = createClient({
        'wx.appId': 'wx123', 'wx.mchId': '1234567890',
        'wx.apiV3Key': '0123456789abcdef0123456789abcdef',
        'wx.mchSerialNo': 'SERIAL001', 'wx.mchPrivateKey': 'mock-key',
      });

      expect(client.verifySignature({}, '{}')).toBe(false);
    });

    it('should return false when timestamp missing', () => {
      client = createClient({
        'wx.appId': 'wx123', 'wx.mchId': '1234567890',
        'wx.apiV3Key': '0123456789abcdef0123456789abcdef',
        'wx.mchSerialNo': 'SERIAL001', 'wx.mchPrivateKey': 'mock-key',
      });

      expect(client.verifySignature({
        'wechatpay-signature': 'sig',
        'wechatpay-nonce': 'nonce',
      }, '{}')).toBe(false);
    });

    it('should return false when platform cert not available', () => {
      client = createClient({
        'wx.appId': 'wx123', 'wx.mchId': '1234567890',
        'wx.apiV3Key': '0123456789abcdef0123456789abcdef',
        'wx.mchSerialNo': 'SERIAL001', 'wx.mchPrivateKey': 'mock-key',
      });

      // platformCert is null → getPlatformCert returns null → false
      expect(client.verifySignature(headers, '{}')).toBe(false);
    });

    it('should verify with correct sign string format (prod mode with cert)', async () => {
      client = createClient({
        'wx.appId': 'wx123', 'wx.mchId': '1234567890',
        'wx.apiV3Key': '0123456789abcdef0123456789abcdef',
        'wx.mchSerialNo': 'SERIAL001', 'wx.mchPrivateKey': 'mock-key',
      });

      // Pre-load platform cert via refresh
      mockedAxios.get = jest.fn().mockResolvedValue({ data: { data: [] } });
      await client.refreshPlatformCerts();

      // Manually set platformCert for testing (access private field)
      (client as any).platformCert = 'mock-platform-cert-pem';

      const result = client.verifySignature(headers, '{"test":true}');

      // crypto.createVerify was called
      expect(crypto.createVerify).toHaveBeenCalledWith('RSA-SHA256');
      expect(result).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // decryptResource
  // ═══════════════════════════════════════════════════════════

  describe('decryptResource', () => {
    it('should return JSON.parse(result) in dev mode', () => {
      client = createClient();
      const result = client.decryptResource(
        JSON.stringify({ trade_state: 'SUCCESS' }),
        'associated_data',
        'nonce123456',
      );
      expect(result).toEqual({ trade_state: 'SUCCESS' });
    });

    it('should decrypt using AES-256-GCM in production mode', () => {
      client = createClient({
        'wx.appId': 'wx123', 'wx.mchId': '1234567890',
        'wx.apiV3Key': '0123456789abcdef0123456789abcdef',
        'wx.mchSerialNo': 'SERIAL001', 'wx.mchPrivateKey': 'mock-key',
      });

      // ciphertext needs to be valid base64 and >= 16 bytes (for auth tag)
      const ciphertext = Buffer.from('{"trade_state":"SUCCESS"}' + '\x00'.repeat(16)).toString('base64');

      const result = client.decryptResource(ciphertext, 'aad', 'nonce123456');
      expect(result).toEqual({ trade_state: 'SUCCESS' });
    });

    it('should throw when decryption fails', () => {
      client = createClient({
        'wx.appId': 'wx123', 'wx.mchId': '1234567890',
        'wx.apiV3Key': '0123456789abcdef0123456789abcdef',
        'wx.mchSerialNo': 'SERIAL001', 'wx.mchPrivateKey': 'mock-key',
      });

      // Make decipher.final() throw
      const mockDecipher = {
        setAAD: jest.fn().mockReturnThis(),
        setAuthTag: jest.fn().mockReturnThis(),
        update: jest.fn(),
        final: jest.fn().mockImplementation(() => { throw new Error('bad decrypt'); }),
      };
      (crypto.createDecipheriv as jest.Mock).mockReturnValue(mockDecipher);

      expect(() => {
        client.decryptResource('invalid-base64!!!', 'aad', 'nonce123456');
      }).toThrow('Callback decryption failed');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // buildJsapiParams
  // ═══════════════════════════════════════════════════════════

  describe('buildJsapiParams', () => {
    it('should return all required JSAPI fields', () => {
      client = createClient({ 'wx.appId': 'wx123' });

      const result = client.buildJsapiParams('prepay_test_123');

      expect(result.timeStamp).toBeDefined();
      expect(result.nonceStr).toBeDefined();
      expect(result.nonceStr).toHaveLength(32); // 16 bytes hex = 32 chars
      expect(result.package).toBe('prepay_id=prepay_test_123');
      expect(result.signType).toBe('RSA');
      expect(result.paySign).toBeDefined();
      expect(result.paySign).toMatch(/^[A-F0-9]{64}$/); // SHA256 hex uppercase
    });

    it('should produce different nonceStr on each call', () => {
      client = createClient({ 'wx.appId': 'wx123' });

      const r1 = client.buildJsapiParams('prepay_1');
      const r2 = client.buildJsapiParams('prepay_1');

      expect(r1.nonceStr).not.toBe(r2.nonceStr);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // refreshPlatformCerts
  // ═══════════════════════════════════════════════════════════

  describe('refreshPlatformCerts', () => {
    it('should not call API in dev mode', async () => {
      client = createClient();
      mockedAxios.get = jest.fn();

      await client.refreshPlatformCerts();

      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should download platform certificate successfully', async () => {
      client = createClient({
        'wx.appId': 'wx123', 'wx.mchId': '1234567890',
        'wx.apiV3Key': '0123456789abcdef0123456789abcdef',
        'wx.mchSerialNo': 'SERIAL001', 'wx.mchPrivateKey': 'mock-key',
      });

      // decryptResource in prod mode will decrypt; use base64 ciphertext
      const plaintext = JSON.stringify({ certificate: 'platform-cert-pem-data' });
      // Need 16+ bytes for auth tag extraction: plaintext padded to >=16 bytes
      const padded = plaintext + '\x00'.repeat(Math.max(0, 16 - plaintext.length));
      const ciphertext = Buffer.from(padded).toString('base64');

      mockedAxios.get = jest.fn().mockResolvedValue({
        data: {
          data: [{
            serial_no: 'PLATFORM_SERIAL_001',
            encrypt_certificate: {
              algorithm: 'AEAD_AES_256_GCM',
              nonce: 'nonce123456',
              associated_data: 'certificate',
              ciphertext,
            },
          }],
        },
      });

      await client.refreshPlatformCerts();

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get.mock.calls[0][0])
        .toBe('https://api.mch.weixin.qq.com/v3/certificates');
    });

    it('should handle network error gracefully', async () => {
      client = createClient({
        'wx.appId': 'wx123', 'wx.mchId': '1234567890',
        'wx.apiV3Key': '0123456789abcdef0123456789abcdef',
        'wx.mchSerialNo': 'SERIAL001', 'wx.mchPrivateKey': 'mock-key',
      });

      mockedAxios.get = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));

      // Should not throw
      await expect(client.refreshPlatformCerts()).resolves.toBeUndefined();
    });
  });
});
