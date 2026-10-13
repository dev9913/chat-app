import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (user && pass) {
      const host = this.configService.get<string>(
        'SMTP_HOST',
        'smtp.gmail.com',
      );

      const port = Number(
        this.configService.get<string>('SMTP_PORT', '587'),
      );

      const secure =
        this.configService.get<string>('SMTP_SECURE', 'false') === 'true';

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });

      this.logger.log(
        `SMTP configured: ${host}:${port} secure=${secure}`,
      );
    } else {
      this.logger.warn(
        'SMTP credentials not configured. Email service running in DEV mode.',
      );
    }
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #FAF7F2; border-radius: 24px; color: #262019;">
        <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">
          Welcome to Chatly
        </h2>

        <p style="font-size: 14px; color: #786C5E; margin-bottom: 24px;">
          Use the verification code below to complete your registration.
          This code will expire in 10 minutes.
        </p>

        <div style="background: #FFFFFF; border: 1px solid #DFD5C6; padding: 18px; border-radius: 16px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2A241E;">
            ${otp}
          </span>
        </div>

        <p style="font-size: 12px; color: #A89B8C; margin: 0;">
          If you didn't request this code, you can safely ignore this email.
        </p>
      </div>
    `;

    if (!this.transporter) {
      this.logger.warn(
        `[DEV MODE] No SMTP configured. Registration OTP for ${email} is: ${otp}`,
      );
      return;
    }

    await this.transporter.sendMail({
      from: this.configService.get<string>(
        'SMTP_FROM',
        'Chatly <no-reply@chatly.com>',
      ),
      to: email,
      subject: `${otp} is your Chatly verification code`,
      html: htmlContent,
    });

    this.logger.log(`OTP email sent to ${email}`);
  }
}

