import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    // Initialize email transporter
    const emailConfig = {
      host: this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com',
      port: parseInt(this.configService.get<string>('SMTP_PORT') || '587'),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true', // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    };

    // Only create transporter if credentials are provided
    if (emailConfig.auth.user && emailConfig.auth.pass) {
      this.transporter = nodemailer.createTransport(emailConfig);
      this.logger.log('Email service initialized');
    } else {
      this.logger.warn('Email service not configured - SMTP credentials missing');
    }
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('Email service not configured. Skipping password reset email.');
      return;
    }

    const fromEmail = this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER');
    const appName = this.configService.get<string>('APP_NAME') || 'HRMS';

    const mailOptions = {
      from: `"${appName}" <${fromEmail}>`,
      to,
      subject: 'Password Reset Request',
      html: this.getPasswordResetEmailTemplate(resetLink, appName),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}:`, error);
      throw error;
    }
  }

  private getPasswordResetEmailTemplate(resetLink: string, appName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
    <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
    <p>Hello,</p>
    <p>You have requested to reset your password for your ${appName} account.</p>
    <p>Click the button below to reset your password:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" 
         style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Reset Password
      </a>
    </div>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #666; font-size: 12px;">${resetLink}</p>
    <p style="color: #666; font-size: 12px; margin-top: 30px;">
      <strong>Important:</strong> This link will expire in 1 hour. If you did not request a password reset, please ignore this email.
    </p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #999; font-size: 11px; margin: 0;">
      This is an automated email from ${appName}. Please do not reply to this email.
    </p>
  </div>
</body>
</html>
    `.trim();
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('Email service connection verified');
      return true;
    } catch (error) {
      this.logger.error('Email service connection failed:', error);
      return false;
    }
  }
}
