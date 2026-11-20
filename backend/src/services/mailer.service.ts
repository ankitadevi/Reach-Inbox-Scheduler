import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export interface SendEmailPayload {
  from: string;
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
}

class MailerService {
  private transporter: nodemailer.Transporter | null = null;
  private testAccount: nodemailer.TestAccount | null = null;
  private isInitializing = false;

  public async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    if (this.isInitializing) {
      // wait if currently initializing
      while (this.isInitializing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (this.transporter) return this.transporter;
    }

    this.isInitializing = true;
    try {
      const envUser = process.env.ETHEREAL_USER;
      const envPass = process.env.ETHEREAL_PASS;

      if (envUser && envPass) {
        console.log(`[Mailer] Using configured Ethereal credentials for: ${envUser}`);
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: envUser,
            pass: envPass,
          },
        });
      } else {
        console.log('[Mailer] Auto-generating ephemeral Ethereal test account...');
        this.testAccount = await nodemailer.createTestAccount();
        console.log(`[Mailer] Ethereal account created: ${this.testAccount.user}`);
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: this.testAccount.user,
            pass: this.testAccount.pass,
          },
        });
      }
      return this.transporter;
    } catch (error: any) {
      console.error('[Mailer] Failed to initialize Ethereal transporter:', error.message);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  public async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const transporter = await this.getTransporter();

    const mailOptions = {
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.body,
      text: payload.body.replace(/<[^>]*>?/gm, ''), // fallback plain text
    };

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log(`[Mailer] Email delivered to ${payload.to}. MessageId: ${info.messageId}`);
    if (previewUrl) {
      console.log(`[Mailer] Preview URL: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl,
    };
  }

  public getSenderAccounts(): string[] {
    return [
      'oliver.brown@domain.io',
      'sarah.outbox@domain.io',
      'alex.reach@domain.io',
      'growth@reachinbox.ai',
    ];
  }
}

export const mailerService = new MailerService();
