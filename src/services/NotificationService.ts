import { ExtractionResult } from '../types';
import { Logger } from '../utils/Logger';
import nodemailer from 'nodemailer';

export class NotificationService {
  private logger: Logger;
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor() {
    this.logger = new Logger('NotificationService');
    this.setupEmailTransporter();
  }

  private setupEmailTransporter(): void {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      this.logger.info('Email transporter configured');
    } else {
      this.logger.warn('Email configuration not found - email notifications disabled');
    }
  }

  async sendSuccessNotification(result: ExtractionResult): Promise<void> {
    const message = `✅ Report extraction successful!

Report: ${result.reportName}
Platform: ${result.metadata.platform}
Extracted at: ${result.metadata.extractedAt}
File path: ${result.filePath}
File size: ${result.metadata.fileSize ? this.formatFileSize(result.metadata.fileSize) : 'Unknown'}
Execution time: ${result.executionTime}ms`;

    await this.sendNotification('Report Extraction Success', message);
  }

  async sendFailureNotification(result: ExtractionResult): Promise<void> {
    const message = `❌ Report extraction failed!

Report: ${result.reportName}
Platform: ${result.metadata.platform}
Failed at: ${result.metadata.extractedAt}
Error: ${result.error}
Attempts: ${result.attempt}
Execution time: ${result.executionTime}ms

Please check the logs for more details.`;

    await this.sendNotification('Report Extraction Failed', message);
  }

  async sendHealthAlert(status: string, details: string): Promise<void> {
    const message = `🚨 Health Alert: ${status}

Details: ${details}
Timestamp: ${new Date().toISOString()}

Please check the system status.`;

    await this.sendNotification('System Health Alert', message);
  }

  private async sendNotification(subject: string, message: string): Promise<void> {
    try {
      // Log the notification
      this.logger.info(`Notification: ${subject}`, { message });

      // Send email if configured
      await this.sendEmail(subject, message);

      // Send webhook if configured
      await this.sendWebhook(subject, message);

    } catch (error) {
      this.logger.error('Failed to send notification', { error: error.message, subject });
    }
  }

  private async sendEmail(subject: string, message: string): Promise<void> {
    if (!this.emailTransporter || !process.env.REPORTS_NOTIFICATION_EMAIL) {
      return;
    }

    try {
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.REPORTS_NOTIFICATION_EMAIL,
        subject: `[Vinny Agent] ${subject}`,
        text: message,
        html: message.replace(/\n/g, '<br>')
      });

      this.logger.info('Email notification sent', { subject });
    } catch (error) {
      this.logger.error('Failed to send email notification', { error: error.message, subject });
    }
  }

  private async sendWebhook(subject: string, message: string): Promise<void> {
    if (!process.env.WEBHOOK_URL) {
      return;
    }

    try {
      const axios = await import('axios');
      
      const payload = {
        text: `**${subject}**\n\n${message}`,
        timestamp: new Date().toISOString(),
        source: 'vinny-agent'
      };

      await axios.default.post(process.env.WEBHOOK_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });

      this.logger.info('Webhook notification sent', { subject });
    } catch (error) {
      this.logger.error('Failed to send webhook notification', { error: error.message, subject });
    }
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

