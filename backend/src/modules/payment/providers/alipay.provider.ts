import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface PaymentResult {
  provider: string;
  payForm?: string;
  codeUrl?: string;
  amount: number;
}

export interface CallbackResult {
  success: boolean;
  outTradeNo: string;
  transactionId: string;
  amount: number;
}

export interface PaymentProvider {
  readonly name: string;
  readonly displayName: string;
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
  verifyCallback(data: Record<string, string>): Promise<CallbackResult>;
  isAvailable(): boolean;
}

export interface CreatePaymentParams {
  outTradeNo: string;
  amount: number;
  subject: string;
}

@Injectable()
export class AlipayProvider implements PaymentProvider {
  readonly name = 'alipay';
  readonly displayName = '支付宝';

  constructor(private readonly config: ConfigService) {}

  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const appId = this.config.get<string>('alipay.appId')!;
    const privateKey = this.config.get<string>('alipay.privateKey')!;
    const returnUrl = this.config.get<string>('alipay.returnUrl')!;
    const notifyUrl = this.config.get<string>('alipay.notifyUrl')!;

    const bizContent = JSON.stringify({
      out_trade_no: params.outTradeNo,
      total_amount: (params.amount / 100).toFixed(2),
      subject: params.subject,
      product_code: 'FAST_INSTANT_TRADE_PAY',
    });

    const signParams: Record<string, string> = {
      app_id: appId,
      method: 'alipay.trade.page.pay',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: this.formatTimestamp(new Date()),
      version: '1.0',
      notify_url: notifyUrl,
      return_url: returnUrl,
      biz_content: bizContent,
    };

    const signStr = Object.keys(signParams).sort().map(k => `${k}=${signParams[k]}`).join('&');
    const sign = crypto.createSign('RSA-SHA256').update(signStr).sign(privateKey, 'base64');
    signParams.sign = sign;

    const formFields = Object.entries(signParams)
      .map(([k, v]) => `<input type="hidden" name="${k}" value="${this.escapeHtml(v)}" />`)
      .join('');

    const payForm = `<form id="alipay-form" action="https://openapi.alipay.com/gateway.do" method="POST">${formFields}<input type="submit" value="正在跳转支付宝..." style="display:none"></form><script>document.getElementById('alipay-form').submit();</script>`;

    return { provider: 'alipay', payForm, amount: params.amount };
  }

  async verifyCallback(data: Record<string, string>): Promise<CallbackResult> {
    const sign = data.sign;
    if (!sign) throw new BadRequestException({ code: 30020, message: '缺少签名' });

    const signType = data.sign_type || 'RSA2';
    const alipayPublicKey = this.config.get<string>('alipay.alipayPublicKey')!;

    const verifyKeys = Object.keys(data).filter(k => k !== 'sign' && k !== 'sign_type' && data[k] !== '' && data[k] !== undefined);
    const signStr = verifyKeys.sort().map(k => `${k}=${data[k]}`).join('&');

    const verify = crypto.createVerify(signType === 'RSA2' ? 'RSA-SHA256' : 'RSA-SHA1');
    verify.update(signStr);
    const ok = verify.verify(alipayPublicKey, sign, 'base64');
    if (!ok) throw new BadRequestException({ code: 30021, message: '支付宝签名验证失败' });

    if (data.trade_status !== 'TRADE_SUCCESS') {
      return { success: false, outTradeNo: data.out_trade_no, transactionId: '', amount: 0 };
    }

    return {
      success: true,
      outTradeNo: data.out_trade_no,
      transactionId: data.trade_no,
      amount: Math.round(parseFloat(data.total_amount) * 100),
    };
  }

  isAvailable(): boolean {
    return !!this.config.get<string>('alipay.appId');
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private formatTimestamp(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}
