"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailgunService = void 0;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const Logger_1 = require("../utils/Logger");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
class MailgunService {
    config;
    logger;
    baseUrl;
    constructor(config) {
        this.config = config;
        this.logger = new Logger_1.Logger('MailgunService');
        this.baseUrl = config.baseUrl || `https://api.mailgun.net/v3/${config.domain}`;
    }
    async sendEmail(options) {
        try {
            const form = new form_data_1.default();
            // Basic email fields
            form.append('from', `${this.config.fromName || 'VinSolutions AI Agent'} <${this.config.fromEmail}>`);
            // Handle multiple recipients
            const recipients = Array.isArray(options.to) ? options.to : [options.to];
            recipients.forEach(recipient => {
                form.append('to', recipient);
            });
            form.append('subject', options.subject);
            if (options.text) {
                form.append('text', options.text);
            }
            if (options.html) {
                form.append('html', options.html);
            }
            // Add tags for tracking
            if (options.tags) {
                options.tags.forEach(tag => {
                    form.append('o:tag', tag);
                });
            }
            else {
                form.append('o:tag', 'ai-agent');
                form.append('o:tag', 'automated-report');
            }
            // Add attachments
            if (options.attachments) {
                for (const attachment of options.attachments) {
                    if (await fs_extra_1.default.pathExists(attachment.path)) {
                        const fileStream = fs_extra_1.default.createReadStream(attachment.path);
                        form.append('attachment', fileStream, {
                            filename: attachment.filename,
                            contentType: this.getContentType(attachment.path)
                        });
                    }
                }
            }
            // Send via Mailgun API
            const response = await axios_1.default.post(`${this.baseUrl}/messages`, form, {
                auth: {
                    username: 'api',
                    password: this.config.apiKey
                },
                headers: {
                    ...form.getHeaders()
                }
            });
            this.logger.info('Email sent successfully via Mailgun', {
                messageId: response.data.id,
                recipients: recipients.length,
                subject: options.subject
            });
        }
        catch (error) {
            this.logger.error('Failed to send email via Mailgun', {
                error: error.message || error,
                subject: options.subject,
                recipients: options.to
            });
            throw error;
        }
    }
    async sendReportEmail(reportPath, reportName, platformName, extractionMetadata, recipients) {
        try {
            const reportStats = await fs_extra_1.default.stat(reportPath);
            const reportFilename = path_1.default.basename(reportPath);
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
              <p style="color: #856404; margin: 0;">This report was automatically extracted by your AI agent using advanced AI and browser automation.</p>
            </div>

            <div style="background: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 4px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #0066cc; margin: 0 0 10px 0;">📈 Performance Metrics</h3>
              <ul style="color: #0066cc; margin: 0; padding-left: 20px;">
                <li>Login: Automated with email 2FA</li>
                <li>Navigation: AI-guided page analysis</li>
                <li>Extraction: ${extractionMetadata.executionTime}ms total time</li>
                <li>Delivery: Professional email via Mailgun</li>
              </ul>
            </div>

            <p style="color: #6c757d; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
              This is an automated message from your VinSolutions AI Agent powered by OpenRouter AI and Mailgun delivery. 
              <br>For questions or support, contact your system administrator.
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
This report was automatically extracted by your AI agent using advanced AI and browser automation.

📈 Performance Metrics
- Login: Automated with email 2FA
- Navigation: AI-guided page analysis  
- Extraction: ${extractionMetadata.executionTime}ms total time
- Delivery: Professional email via Mailgun

This is an automated message from your VinSolutions AI Agent.
      `;
            await this.sendEmail({
                to: recipients,
                subject: subject,
                text: textContent,
                html: htmlContent,
                attachments: [
                    {
                        filename: reportFilename,
                        path: reportPath
                    }
                ],
                tags: ['report-delivery', platformName.toLowerCase(), reportName.toLowerCase().replace(/\s+/g, '-')]
            });
            this.logger.info(`Report email sent successfully via Mailgun`, {
                reportName,
                platformName,
                fileSize: reportStats.size,
                recipients: recipients.length
            });
        }
        catch (error) {
            this.logger.error('Failed to send report email via Mailgun', {
                error: error.message || error,
                reportPath,
                reportName
            });
            throw error;
        }
    }
    async sendNotificationEmail(subject, message, recipients, isError = false) {
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
              <br>Delivered via Mailgun
            </p>
          </div>
        </div>
      `;
            const textContent = `${emoji} ${subject}

${message}

This is an automated notification from your VinSolutions AI Agent.
Timestamp: ${new Date().toISOString()}
Delivered via Mailgun`;
            await this.sendEmail({
                to: recipients,
                subject: `${emoji} ${subject}`,
                text: textContent,
                html: htmlContent,
                tags: ['notification', isError ? 'error' : 'success']
            });
            this.logger.info(`Notification email sent via Mailgun: ${subject}`, {
                isError,
                recipients: recipients.length
            });
        }
        catch (error) {
            this.logger.error('Failed to send notification email via Mailgun', {
                error: error.message || error,
                subject
            });
            throw error;
        }
    }
    async testConnection() {
        try {
            // Test by sending a simple email to the from address
            await this.sendEmail({
                to: this.config.fromEmail,
                subject: 'Mailgun Connection Test',
                text: 'This is a test email to verify Mailgun configuration is working correctly.',
                html: '<p>This is a test email to verify Mailgun configuration is working correctly.</p>',
                tags: ['connection-test']
            });
            this.logger.info('Mailgun connection test successful');
            return true;
        }
        catch (error) {
            this.logger.error('Mailgun connection test failed', { error: error.message || error });
            return false;
        }
    }
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0)
            return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    getContentType(filePath) {
        const ext = path_1.default.extname(filePath).toLowerCase();
        const contentTypes = {
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xls': 'application/vnd.ms-excel',
            '.csv': 'text/csv',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain'
        };
        return contentTypes[ext] || 'application/octet-stream';
    }
}
exports.MailgunService = MailgunService;
//# sourceMappingURL=MailgunService.js.map