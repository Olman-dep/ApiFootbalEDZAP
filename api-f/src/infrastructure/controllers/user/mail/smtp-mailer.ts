import { Injectable } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import type { Mailer } from '../../../../application/user/ports/mailer.port.js';

@Injectable()
export class SmtpMailer implements Mailer {
  private readonly transport = createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const url = `${process.env.APP_URL}/users/verify-email?token=${token}`;
    await this.transport.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: 'Verifica tu correo',
      html: `<p>Haz clic para verificar tu correo:</p><a href="${url}">${url}</a>`,
    });
  }
}