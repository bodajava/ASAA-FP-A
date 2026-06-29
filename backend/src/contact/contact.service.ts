import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ContactDto } from './dto/contact.dto';

export interface MailResult {
  success: boolean;
  method: 'smtp' | 'local';
  message: string;
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendContactMessage(dto: ContactDto): Promise<MailResult> {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;

    if (smtpHost && smtpPort) {
      try {
        return await this.sendViaSmtp(dto);
      } catch (error) {
        this.logger.error(
          `SMTP send failed: ${error instanceof Error ? error.message : 'unknown'}`,
        );
        return this.saveLocally(
          dto,
          `SMTP failed: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }

    return this.saveLocally(dto, 'No SMTP configured');
  }

  private async sendViaSmtp(dto: ContactDto): Promise<MailResult> {
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });

    const supportEmailTo = process.env.SUPPORT_EMAIL_TO || 'bbido761@gmail.com';
    const smtpFrom =
      process.env.SMTP_FROM || 'Harvest Support <no-reply@harvest.local>';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Harvest Support Request</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Name:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${dto.fullName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Email:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${dto.email}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Type:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${dto.inquiryType}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Priority:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${dto.priority || 'Normal'}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Subject:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${dto.subject}</td></tr>
          ${dto.sourcePage ? `<tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Source Page:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${dto.sourcePage}</td></tr>` : ''}
        </table>
        <div style="margin-top: 16px; padding: 16px; background: #f8fafc; border-radius: 8px;">
          <h3 style="margin: 0 0 8px 0; color: #334155;">Message:</h3>
          <p style="margin: 0; color: #475569; white-space: pre-wrap;">${dto.message}</p>
        </div>
        <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">Sent from Harvest FP&A System</p>
      </div>
    `;

    await transporter.sendMail({
      from: smtpFrom,
      to: supportEmailTo,
      replyTo: dto.email,
      subject: `[${dto.inquiryType}] ${dto.subject}`,
      html: htmlBody,
    });

    this.logger.log(
      `Support email sent to ${supportEmailTo} from ${dto.email}`,
    );
    return {
      success: true,
      method: 'smtp',
      message: 'Email sent successfully',
    };
  }

  private async saveLocally(
    dto: ContactDto,
    reason: string,
  ): Promise<MailResult> {
    this.logger.log(`Saving support message locally (${reason})`);

    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS support_messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          full_name VARCHAR(200) NOT NULL,
          email VARCHAR(200) NOT NULL,
          inquiry_type VARCHAR(100) NOT NULL,
          subject VARCHAR(500) NOT NULL,
          message TEXT NOT NULL,
          priority VARCHAR(50) DEFAULT 'normal',
          source_page VARCHAR(200),
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO support_messages (full_name, email, inquiry_type, subject, message, priority, source_page) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        dto.fullName,
        dto.email,
        dto.inquiryType,
        dto.subject,
        dto.message,
        dto.priority || 'normal',
        dto.sourcePage || null,
      );

      return {
        success: true,
        method: 'local',
        message:
          'Support message saved locally. Configure SMTP to send emails automatically.',
      };
    } catch (error) {
      this.logger.error(
        `Failed to save support message locally: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return {
        success: false,
        method: 'local',
        message: 'Failed to save support message. Please try again later.',
      };
    }
  }
}
