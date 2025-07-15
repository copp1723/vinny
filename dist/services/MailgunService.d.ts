export interface MailgunConfig {
    apiKey: string;
    domain: string;
    baseUrl?: string;
    fromEmail: string;
    fromName?: string;
}
export interface MailgunEmailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{
        filename: string;
        path: string;
    }>;
    tags?: string[];
}
export declare class MailgunService {
    private config;
    private logger;
    private baseUrl;
    constructor(config: MailgunConfig);
    sendEmail(options: MailgunEmailOptions): Promise<void>;
    sendReportEmail(reportPath: string, reportName: string, platformName: string, extractionMetadata: any, recipients: string[]): Promise<void>;
    sendNotificationEmail(subject: string, message: string, recipients: string[], isError?: boolean): Promise<void>;
    testConnection(): Promise<boolean>;
    private formatFileSize;
    private getContentType;
}
//# sourceMappingURL=MailgunService.d.ts.map