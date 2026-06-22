import { Injectable, BadRequestException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly codeMap = new Map<string, { code: string; expires: number }>();
  private readonly limitMap = new Map<string, number>();

  constructor(private readonly config: ConfigService) {}

  /** 发送短信验证码。生产环境调阿里云，开发环境控制台打印。 */
  async sendCode(phone: string): Promise<void> {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      throw new BadRequestException({ code: 10010, message: '手机号格式不正确' });
    }

    // 频率限制：60 秒内不可重复发送
    const now = Date.now();
    const lastSend = this.limitMap.get(phone) ?? 0;
    if (now - lastSend < 60000) {
      const remain = Math.ceil((60000 - (now - lastSend)) / 1000);
      throw new HttpException({ code: 10011, message: `请 ${remain} 秒后再试` }, HttpStatus.TOO_MANY_REQUESTS);
    }

    // 生成 6 位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 存储（5 分钟有效）
    this.codeMap.set(phone, { code, expires: now + 300000 });
    this.limitMap.set(phone, now);

    // 发送短信
    const accessKeyId = this.config.get<string>('sms.accessKeyId');
    if (accessKeyId) {
      try {
        await this.sendViaAlibaba(phone, code);
      } catch (error) {
        this.codeMap.delete(phone);
        this.limitMap.delete(phone);
        this.logger.error(`SMS send failed for ${phone}`, error instanceof Error ? error.stack : undefined);
        throw new HttpException({ code: 10012, message: '短信发送失败，请稍后重试' }, HttpStatus.BAD_GATEWAY);
      }
    } else {
      // Dev: 控制台打印
      console.log(`\n[DEV SMS] 验证码 ${code} → ${phone}\n`);
    }
  }

  /** 校验验证码 */
  verifyCode(phone: string, code: string): boolean {
    const stored = this.codeMap.get(phone);
    if (!stored) {
      throw new BadRequestException({ code: 10013, message: '请先获取验证码' });
    }
    if (Date.now() > stored.expires) {
      this.codeMap.delete(phone);
      throw new BadRequestException({ code: 10014, message: '验证码已过期' });
    }
    if (stored.code !== code) {
      throw new BadRequestException({ code: 10015, message: '验证码不正确' });
    }
    // 一次性使用
    this.codeMap.delete(phone);
    return true;
  }

  private async sendViaAlibaba(phone: string, code: string): Promise<void> {
    const crypto = await import('crypto');
    const axios = (await import('axios')).default;

    const accessKeyId = this.config.get<string>('sms.accessKeyId')!;
    const accessKeySecret = this.config.get<string>('sms.accessKeySecret')!;

    const params: Record<string, string> = {
      AccessKeyId: accessKeyId,
      Action: 'SendSms',
      Format: 'JSON',
      PhoneNumbers: phone,
      SignName: this.config.get<string>('sms.signName')!,
      TemplateCode: this.config.get<string>('sms.templateCode')!,
      TemplateParam: JSON.stringify({ code }),
      SignatureMethod: 'HMAC-SHA1',
      SignatureVersion: '1.0',
      SignatureNonce: Math.random().toString(36).substring(2),
      Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      Version: '2017-05-25',
    };

    const sortedKeys = Object.keys(params).sort();
    const canonicalized = sortedKeys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
    const stringToSign = `POST&${encodeURIComponent('/')}&${encodeURIComponent(canonicalized)}`;
    const signature = crypto.createHmac('sha1', `${accessKeySecret}&`).update(stringToSign).digest('base64');
    params.Signature = signature;

    await axios.post('https://dysmsapi.aliyuncs.com/', new URLSearchParams(params).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    });
  }
}
