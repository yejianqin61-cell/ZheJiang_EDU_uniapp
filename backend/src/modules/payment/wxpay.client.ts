import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';

/**
 * WeChat Pay API v3 client.
 *
 * Reference: https://pay.weixin.qq.com/docs/merchant/development/chapter-guide
 *
 * In dev mode (no WX_MCH_ID configured), returns mock data.
 */
@Injectable()
export class WxPayClient {
  private readonly appId: string;
  private readonly mchId: string;
  private readonly apiV3Key: string;
  private readonly baseUrl = 'https://api.mch.weixin.qq.com';

  constructor(private readonly config: ConfigService) {
    this.appId = config.get<string>('wx.appId', '');
    this.mchId = config.get<string>('wx.mchId', '');
    this.apiV3Key = config.get<string>('wx.apiV3Key', '');
  }

  get isAvailable(): boolean {
    return !!(this.appId && this.mchId && this.apiV3Key);
  }

  /**
   * 统一下单 — JSAPI
   * Returns the prepay_id for wx.requestPayment.
   */
  async unifiedOrder(params: {
    outTradeNo: string;
    amount: number; // cents
    description: string;
    openid: string;
  }): Promise<{ prepayId: string; wxPayParams: Record<string, string> }> {
    if (!this.isAvailable) {
      return this.mockUnifiedOrder(params);
    }

    const body = {
      appid: this.appId,
      mchid: this.mchId,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: '', // TODO: configure callback URL
      amount: { total: params.amount, currency: 'CNY' },
      payer: { openid: params.openid },
    };

    // TODO: real HTTP call with WeChat Pay v3 signature
    // const res = await axios.post(`${this.baseUrl}/v3/pay/transactions/jsapi`, body, {
    //   headers: this.buildHeaders('POST', '/v3/pay/transactions/jsapi', body),
    // });
    // const prepayId = res.data.prepay_id;
    // return { prepayId, wxPayParams: this.buildJsapiParams(prepayId) };

    throw new Error('WeChat Pay v3 HTTP call not yet implemented');
  }

  /**
   * Verify callback signature.
   */
  verifySignature(headers: Record<string, string>, body: string): boolean {
    if (!this.isAvailable) {
      return true; // dev mode: accept all
    }

    // TODO:
    // const signature = headers['wechatpay-signature'];
    // const timestamp = headers['wechatpay-timestamp'];
    // const nonce = headers['wechatpay-nonce'];
    // const serial = headers['wechatpay-serial'];
    // Build sign string: `${timestamp}\n${nonce}\n${body}\n`
    // Verify with WeChat Pay public key
    return true;
  }

  /**
   * Decrypt callback resource.
   */
  decryptResource(ciphertext: string, associatedData: string, nonce: string): any {
    if (!this.isAvailable) {
      // dev mode: the body IS the plaintext
      return JSON.parse(ciphertext);
    }

    // TODO: AES-256-GCM decrypt with apiV3Key
    throw new Error('Callback decryption not yet implemented');
  }

  // ── Dev mock ──

  private mockUnifiedOrder(params: { outTradeNo: string; amount: number; description: string; openid: string }) {
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

  // ── Helpers ──

  private buildJsapiParams(prepayId: string): Record<string, string> {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonceStr = randomBytes(16).toString('hex');
    const pkg = `prepay_id=${prepayId}`;
    const signStr = `${this.appId}\n${timestamp}\n${nonceStr}\n${pkg}\n`;
    const paySign = createHash('sha256').update(signStr).digest('hex').toUpperCase();

    return {
      timeStamp: timestamp,
      nonceStr,
      package: pkg,
      signType: 'RSA',
      paySign,
    };
  }
}
