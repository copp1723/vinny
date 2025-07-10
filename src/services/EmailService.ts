import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { Logger } from '../utils/Logger';
import fs from 'fs-extra';
import path from 'path';

export interface EmailConfig {
  // SMTP settings for sending emails
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  // IMAP settings for reading emails
  imap: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  // Email addresses
  agentEmail: string;
  reportRecipients: string[];
}

export interface EmailMessage {
  from: string;
  subject: string;
  text: string;
  html?: string;
  date: Date;
}

export interface TwoFactorCode {
  code: string;
  timestamp: Date;
  source: string;
}

export class EmailService {
  private config: EmailConfig;
  private logger: Logger;
  private smtpTransporter: nodemailer.Transporter;
  private imapClient: ImapFlow | null = null;

  constructor(config: EmailConfig) {
    this.config = config;
    this.logger = new Logger('EmailService');
    
    // Create SMTP transporter - Fixed method name
    this.smtpTransporter = nodemailer.createTransport({
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      secure: this.config.smtp.secure,
      auth: this.config.smtp.auth,
      tls: {
        rejectUnauthorized: false // For development - use proper certs in production
      }
    });
  }

  async initialize(): Promise<void> {
    try {
      // Test SMTP connection
      await this.smtpTransporter.verify();
      this.logger.info('SMTP connection verified successfully');

      // Test IMAP connection
      await this.connectIMAP();
      this.logger.info('Email service initialized successfully');
    } catch (error: any) {
      this.logger.error('Failed to initialize email service', { error: error.message || error });
      throw error;
    }
  }

  private async connectIMAP(): Promise<void> {
    if (this.imapClient) {
      await this.imapClient.logout();
    }

    this.imapClient = new ImapFlow({
      host: this.config.imap.host,
      port: this.config.imap.port,
      secure: this.config.imap.secure,
      auth: this.config.imap.auth,
      logger: false // Disable IMAP logging for cleaner output
    });

    await this.imapClient.connect();
    this.logger.info('IMAP connection established');
  }

  async sendReportEmail(
    reportPath: string, 
    reportName: string, 
    platformName: string,
    extractionMetadata: any
  ): Promise<void> {
    try {
      const reportStats = await fs.stat(reportPath);
      const reportFilename = path.basename(reportPath);
      
      const subject = `📊 ${reportName} Report - ${platformName} (${new Date().toLocaleDateString()})`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">📊 Automated Report Delivery</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your ${platformName} report has been successfully extracted</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef;">
            <h2 style="color: #495057; margin-top: 0;">Report Details</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
              <tr style="background: white;">
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold; width: 30%;">Report Name:</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${reportName}</td>
              </tr>
              <tr style="background: #f8f9fa;">
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Platform:</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${platformName}</td>
              </tr>
              <tr style="background: white;">
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Extracted:</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${extractionMetadata.extractedAt}</td>
              </tr>
              <tr style="background: #f8f9fa;">
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">File Size:</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${this.formatFileSize(reportStats.size)}</td>
              </tr>
              <tr style="background: white;">
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">Execution Time:</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${extractionMetadata.executionTime}ms</td>
              </tr>
            </table>

            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #155724; margin: 0 0 10px 0;">✅ Extraction Successful</h3>
              <p style="color: #155724; margin: 0;">The report has been automatically extracted and is attached to this email.</p>
            </div>

            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #856404; margin: 0 0 10px 0;">🤖 Automated by AI Agent</h3>
              <p style="color: #856404; margin: 0;">This report was automatically extracted by your AI agent. No human intervention was required.</p>
            </div>

            <p style="color: #6c757d; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              This is an automated message from your VinSolutions AI Agent. 
              If you have any questions, please contact your system administrator.
            </p>
          </div>
        </div>
      `;

      const textContent = `
📊 Automated Report Delivery

Report Details:
- Report Name: ${reportName}
- Platform: ${platformName}
- Extracted: ${extractionMetadata.extractedAt}
- File Size: ${this.formatFileSize(reportStats.size)}
- Execution Time: ${extractionMetadata.executionTime}ms

✅ Extraction Successful
The report has been automatically extracted and is attached to this email.

🤖 Automated by AI Agent
This report was automatically extracted by your AI agent. No human intervention was required.

This is an automated message from your VinSolutions AI Agent.
      `;

      // Send to all configured recipients
      for (const recipient of this.config.reportRecipients) {
        await this.smtpTransporter.sendMail({
          from: `"VinSolutions AI Agent" <${this.config.agentEmail}>`,
          to: recipient,
          subject: subject,
          text: textContent,
          html: htmlContent,
          attachments: [
            {
              filename: reportFilename,
              path: reportPath,
              contentType: this.getContentType(reportPath)
            }
          ]
        });

        this.logger.info(`Report email sent successfully to ${recipient}`, {
          reportName,
          platformName,
          fileSize: reportStats.size
        });
      }

    } catch (error: any) {
      this.logger.error('Failed to send report email', {
        error: error.message || error,
        reportPath,
        reportName
      });
      throw error;
    }
  }

  async waitForTwoFactorCode(
    timeoutMs: number = 300000, // 5 minutes default
    fromDomain: string = 'vinsolutions.com'
  ): Promise<TwoFactorCode> {
    const startTime = Date.now();
    
    try {
      if (!this.imapClient) {
        await this.connectIMAP();
      }

      // Select INBOX - Fixed method name
      await this.imapClient!.mailboxOpen('INBOX');
      
      this.logger.info(`Waiting for 2FA code from ${fromDomain}...`);

      while (Date.now() - startTime < timeoutMs) {
        try {
          // Search for recent emails from the domain
          const searchCriteria = {
            from: fromDomain,
            since: new Date(startTime - 60000) // 1 minute before we started
          };

          const messages = await this.imapClient!.search(searchCriteria);
          
          // Handle the search results properly
          if (Array.isArray(messages) && messages.length > 0) {
            for (const messageSeq of messages) {
              const email = await this.imapClient!.fetchOne(messageSeq, { 
                source: true 
              });
              
              if (email && email.source) {
                const parsed = await simpleParser(email.source);
                
                // Look for 2FA codes in the email
                const code = this.extract2FACode(parsed.text || '', parsed.html || '');
                
                if (code) {
                  this.logger.info(`2FA code found: ${code}`, {
                    from: parsed.from?.text,
                    subject: parsed.subject,
                    date: parsed.date
                  });

                  return {
                    code,
                    timestamp: parsed.date || new Date(),
                    source: parsed.from?.text || 'unknown'
                  };
                }
              }
            }
          }

          // Wait 5 seconds before checking again
          await new Promise(resolve => setTimeout(resolve, 5000));

        } catch (searchError: any) {
          this.logger.debug('Search iteration failed, retrying...', { 
            error: searchError.message || searchError
          });
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      throw new Error(`Timeout waiting for 2FA code from ${fromDomain}`);

    } catch (error: any) {
      this.logger.error('Failed to retrieve 2FA code', { 
        error: error.message || error,
        fromDomain 
      });
      throw error;
    }
  }

  private extract2FACode(text: string, html: string): string | null {
    const content = text + ' ' + html;
    
    // Common 2FA code patterns
    const patterns = [
      /verification code[:\s]+(\d{4,8})/i,
      /your code[:\s]+(\d{4,8})/i,
      /security code[:\s]+(\d{4,8})/i,
      /access code[:\s]+(\d{4,8})/i,
      /(\d{6})/g, // Generic 6-digit codes
      /(\d{4})/g, // Generic 4-digit codes
    ];

    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        const code = matches[1] || matches[0];
        // Validate it's a reasonable 2FA code (4-8 digits)
        if (/^\d{4,8}$/.test(code)) {
          return code;
        }
      }
    }

    return null;
  }

  async sendNotificationEmail(
    subject: string,
    message: string,
    isError: boolean = false
  ): Promise<void> {
    try {
      const emoji = isError ? '❌' : '✅';
      const color = isError ? '#dc3545' : '#28a745';
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">${emoji} ${subject}</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e9ecef;">
            <p style="color: #495057; font-size: 16px; line-height: 1.5;">${message}</p>
            
            <p style="color: #6c757d; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              This is an automated notification from your VinSolutions AI Agent.
              <br>Timestamp: ${new Date().toISOString()}
            </p>
          </div>
        </div>
      `;

      for (const recipient of this.config.reportRecipients) {
        await this.smtpTransporter.sendMail({
          from: `"VinSolutions AI Agent" <${this.config.agentEmail}>`,
          to: recipient,
          subject: `${emoji} ${subject}`,
          text: `${message}\n\nThis is an automated notification from your VinSolutions AI Agent.\nTimestamp: ${new Date().toISOString()}`,
          html: htmlContent
        });
      }

      this.logger.info(`Notification email sent: ${subject}`, { isError });

    } catch (error: any) {
      this.logger.error('Failed to send notification email', {
        error: error.message || error,
        subject
      });
      throw error;
    }
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.csv': 'text/csv',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain'
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  async close(): Promise<void> {
    try {
      if (this.imapClient) {
        await this.imapClient.logout();
        this.imapClient = null;
      }
      this.smtpTransporter.close();
      this.logger.info('Email service closed');
    } catch (error: any) {
      this.logger.error('Error closing email service', { error: error.message || error });
    }
  }
}

