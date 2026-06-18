import { Injectable, Logger } from '@nestjs/common';
import { createTransport } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: ReturnType<typeof createTransport>;
  private readonly codeMap = new Map<string, { code: string; expires: number }>();

  constructor() {
    const host = process.env.SMTP_HOST || 'smtp.qq.com';
    const port = Number(process.env.SMTP_PORT) || 465;
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';

    this.transporter = createTransport({
      host,
      port,
      secure: true,
      auth: { user, pass },
    });
  }

  /** 发送6位验证码到邮箱 */
  async sendCode(to: string): Promise<void> {
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // 存储验证码，5分钟过期
    this.codeMap.set(to, { code, expires: Date.now() + 5 * 60 * 1000 });

    await this.transporter.sendMail({
      from: `"瓯越AI组题网" <${process.env.SMTP_USER}>`,
      to,
      subject: '瓯越AI组题网 — 邮箱验证码',
      html: `<div style="font-family: sans-serif; padding: 20px;">
        <h3>您的验证码是：<strong style="color:#d4743a;font-size:24px">${code}</strong></h3>
        <p>有效期 5 分钟。如非本人操作请忽略。</p>
      </div>`,
    });

    this.logger.log(`Verification code sent to ${to}`);
  }

  /** 校验验证码 */
  verifyCode(email: string, code: string): boolean {
    const entry = this.codeMap.get(email);
    if (!entry) return false;
    if (Date.now() > entry.expires) {
      this.codeMap.delete(email);
      return false;
    }
    if (entry.code !== code) return false;
    this.codeMap.delete(email);
    return true;
  }
}
