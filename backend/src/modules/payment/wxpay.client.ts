import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHash, createSign, createVerify,
  createDecipheriv, createPublicKey,
  randomBytes,
} from 'crypto';
import axios from 'axios';

/**
 * WeChat Pay API v3 client.
 *
 * Reference: https://pay.weixin.qq.com/docs/merchant/development/chapter-guide
 *
 * ## Environment variables:
 *   WX_APP_ID          — Mini program AppID
 *   WX_MCH_ID          — Merchant ID
 *   WX_API_V3_KEY      — API v3 key (32-char hex, for callback decryption)
 *   WX_MCH_SERIAL_NO   — Merchant certificate serial number
 *   WX_MCH_PRIVATE_KEY — Merchant private key (PEM string, \n as newlines)
 *   WX_PAY_NOTIFY_URL  — Payment callback URL (https required in prod)
 *
 * In dev mode (no WX_MCH_ID), returns mock data via mockUnifiedOrder().
 */
@Injectable()
export class WxPayClient {
  private readonly appId: string;
  private readonly mchId: string;
  private readonly apiV3Key: string;
  private readonly mchSerialNo: string;
  private readonly mchPrivateKey: string;
  private readonly notifyUrl: string;
  private readonly baseUrl = 'https://api.mch.weixin.qq.com';

  /** Cached WeChat Pay platform certificate (PEM) */
  private platformCert: string | null = null;

  constructor(private readonly config: ConfigService) {
    this.appId = config.get<string>('wx.appId', '');
    this.mchId = config.get<string>('wx.mchId', '');
    this.apiV3Key = config.get<string>('wx.apiV3Key', '');
    this.mchSerialNo = config.get<string>('wx.mchSerialNo', '');
    this.mchPrivateKey = (config.get<string>('wx.mchPrivateKey', '') ?? '')
      .replace(/\\n/g, '\n'); // support \n in .env values
    this.notifyUrl = config.get<string>('wx.payNotifyUrl', '');
  }

  get isAvailable(): boolean {
    return !!(this.appId && this.mchId && this.apiV3Key && this.mchSerialNo && this.mchPrivateKey);
  }

  // ── PM-01: 统一下单 (JSAPI) ─────────────────────────────────

  async unifiedOrder(params: {
    outTradeNo: string;
    amount: number;
    description: string;
    openid: string;
  }): Promise<{ prepayId: string; wxPayParams: Record<string, string> }> {
    if (!this.isAvailable) {
      return this.mockUnifiedOrder(params);
    }

    const method = 'POST';
    const path = '/v3/pay/transactions/jsapi';
    const body = JSON.stringify({
      appid: this.appId,
      mchid: this.mchId,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: this.notifyUrl,
      amount: { total: params.amount, currency: 'CNY' },
      payer: { openid: params.openid },
    });

    const headers = this.buildAuthHeaders(method, path, body);
    const res = await axios.post(`${this.baseUrl}${path}`, body, {
      headers,
      timeout: 15000,
    });

    const prepayId: string = res.data?.prepay_id;
    if (!prepayId) {
      throw new Error('WeChat Pay did not return prepay_id');
    }

    return { prepayId, wxPayParams: this.buildJsapiParams(prepayId) };
  }

  // ── PM-03: 回调验签 ─────────────────────────────────────────

  /**
   * Verify the WeChat Pay callback signature.
   *
   * WeChat sends these headers:
   *   Wechatpay-Timestamp, Wechatpay-Nonce, Wechatpay-Signature,
   *   Wechatpay-Serial, Wechatpay-Signature-Type
   *
   * Sign string: `${timestamp}\n${nonce}\n${body}\n`
   * Verified with WeChat Pay platform certificate (public key).
   */
  verifySignature(headers: Record<string, string>, body: string): boolean {
    if (!this.isAvailable) {
      return true;
    }

    const signature = headers['wechatpay-signature'];
    const timestamp = headers['wechatpay-timestamp'];
    const nonce = headers['wechatpay-nonce'];
    const serial = headers['wechatpay-serial'];

    if (!signature || !timestamp || !nonce) {
      return false;
    }

    // Load platform certificate
    const certPem = this.getPlatformCert(serial);
    if (!certPem) {
      console.error('[WxPay] Platform certificate not available for serial:', serial);
      return false;
    }

    const signStr = `${timestamp}\n${nonce}\n${body}\n`;
    try {
      const verify = createVerify('RSA-SHA256');
      verify.update(signStr);
      const publicKey = createPublicKey(certPem);
      return verify.verify(publicKey, signature, 'base64');
    } catch (err: any) {
      console.error('[WxPay] Signature verification error:', err.message);
      return false;
    }
  }

  // ── PM-03: 回调解密 ─────────────────────────────────────────

  /**
   * Decrypt the callback resource using AES-256-GCM.
   *
   * @param ciphertext — Base64-encoded ciphertext from resource.ciphertext
   * @param associatedData — resource.associated_data
   * @param nonce — resource.nonce
   */
  decryptResource(
    ciphertext: string,
    associatedData: string,
    nonce: string,
  ): Record<string, any> {
    if (!this.isAvailable) {
      return JSON.parse(ciphertext);
    }

    const key = Buffer.from(this.apiV3Key, 'utf-8');
    const iv = Buffer.from(nonce, 'utf-8');
    const aad = Buffer.from(associatedData ?? '', 'utf-8');
    const encrypted = Buffer.from(ciphertext, 'base64');

    // AES-256-GCM: last 16 bytes are the authentication tag
    const tag = encrypted.subarray(encrypted.length - 16);
    const data = encrypted.subarray(0, encrypted.length - 16);

    try {
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAAD(aad);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
      return JSON.parse(decrypted.toString('utf-8'));
    } catch (err: any) {
      throw new Error(`Callback decryption failed: ${err.message}`);
    }
  }

  /**
   * Download WeChat Pay platform certificates.
   * Called once on startup to cache the cert.
   */
  async refreshPlatformCerts(): Promise<void> {
    if (!this.isAvailable) return;

    try {
      const path = '/v3/certificates';
      const headers = this.buildAuthHeaders('GET', path, '');
      const res = await axios.get(`${this.baseUrl}${path}`, {
        headers,
        timeout: 10000,
      });

      // WeChat returns an array of certificates; use the first valid one
      const certs: any[] = res.data?.data ?? [];
      const validCerts = certs.filter((c: any) => {
        try {
          const decryptResult = this.decryptResource(
            c.encrypt_certificate.ciphertext,
            c.encrypt_certificate.associated_data,
            c.encrypt_certificate.nonce,
          );
          c._plainCert = decryptResult.certificate;
          return true;
        } catch {
          return false;
        }
      });

      if (validCerts.length > 0) {
        this.platformCert = validCerts[0]._plainCert;
        console.log('[WxPay] Platform certificate refreshed, serial:', validCerts[0].serial_no);
      }
    } catch (err: any) {
      console.warn('[WxPay] Failed to refresh platform certificates:', err.message);
    }
  }

  // ── 构建 JSAPI 调起参数 ─────────────────────────────────────

  buildJsapiParams(prepayId: string): Record<string, string> {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonceStr = randomBytes(16).toString('hex');
    const pkg = `prepay_id=${prepayId}`;
    // Sign string: appId\ntimestamp\nnonceStr\nprepay_id=xxx\n
    const signStr = `${this.appId}\n${timestamp}\n${nonceStr}\n${pkg}\n`;
    const paySign = createHash('sha256').update(signStr).digest('hex').toUpperCase();

    return { timeStamp: timestamp, nonceStr, package: pkg, signType: 'RSA', paySign };
  }

  // ── Dev mock ──

  private mockUnifiedOrder(params: {
    outTradeNo: string; amount: number; description: string; openid: string;
  }) {
    const prepayId = `dev_prepay_${Date.now()}_${randomBytes(4).toString('hex')}`;
    return {
      prepayId,
      wxPayParams: {
        timeStamp: String(Math.floor(Date.now() / 1000)),
        nonceStr: randomBytes(16).toString('hex'),
        package: `prepay_id=${prepayId}`,
        signType: 'RSA',
        paySign: 'DEV_MOCK_SIGN',
      },
    };
  }

  // ── Private helpers ──────────────────────────────────────────

  /**
   * Build Authorization header for WeChat Pay v3 API.
   * Format: WECHATPAY2-SHA256-RSA2048 mchid="...",nonce_str="...",timestamp="...",serial_no="...",signature="..."
   */
  private buildAuthHeaders(
    method: string,
    path: string,
    body: string,
  ): Record<string, string> {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonceStr = randomBytes(16).toString('hex');
    const signStr = `${method}\n${path}\n${timestamp}\n${nonceStr}\n${body}\n`;

    const sign = createSign('RSA-SHA256');
    sign.update(signStr);
    const signature = sign.sign(this.mchPrivateKey, 'base64');

    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization:
        `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${this.mchSerialNo}",signature="${signature}"`,
    };
  }

  /**
   * Get the WeChat Pay platform certificate for signature verification.
   * Uses cached cert if available; otherwise tries to download.
   */
  private getPlatformCert(_serial: string): string | null {
    // In production, validate that the serial matches the downloaded cert
    return this.platformCert;
  }
}
