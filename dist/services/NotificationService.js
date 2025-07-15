"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const Logger_1 = require("../utils/Logger");
const nodemailer_1 = __importDefault(require("nodemailer"));
class NotificationService {
    logger;
    emailTransporter = null;
    constructor() {
        this.logger = new Logger_1.Logger('NotificationService');
        this.setupEmailTransporter();
    }
    setupEmailTransporter() {
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            this.emailTransporter = nodemailer_1.default.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            this.logger.info('Email transporter configured');
        }
        else {
            this.logger.warn('Email configuration not found - email notifications disabled');
        }
    }
    async sendSuccessNotification(result) {
        const message = `✅ Report extraction successful!

Report: ${result.reportName}
Platform: ${result.metadata.platform}
Extracted at: ${result.metadata.extractedAt}
File path: ${result.filePath}
File size: ${result.metadata.fileSize ? this.formatFileSize(result.metadata.fileSize) : 'Unknown'}
Execution time: ${result.executionTime}ms`;
        await this.sendNotification('Report Extraction Success', message);
    }
    async sendFailureNotification(result) {
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
    async sendHealthAlert(status, details) {
        const message = `🚨 Health Alert: ${status}

Details: ${details}
Timestamp: ${new Date().toISOString()}

Please check the system status.`;
        await this.sendNotification('System Health Alert', message);
    }
    async sendNotification(subject, message) {
        try {
            // Log the notification
            this.logger.info(`Notification: ${subject}`, { message });
            // Send email if configured
            await this.sendEmail(subject, message);
            // Send webhook if configured
            await this.sendWebhook(subject, message);
        }
        catch (error) {
            this.logger.error('Failed to send notification', { error: error.message, subject });
        }
    }
    async sendEmail(subject, message) {
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
        }
        catch (error) {
            this.logger.error('Failed to send email notification', { error: error.message, subject });
        }
    }
    async sendWebhook(subject, message) {
        if (!process.env.WEBHOOK_URL) {
            return;
        }
        try {
            const axios = await Promise.resolve().then(() => __importStar(require('axios')));
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
        }
        catch (error) {
            this.logger.error('Failed to send webhook notification', { error: error.message, subject });
        }
    }
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0)
            return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=NotificationService.js.map