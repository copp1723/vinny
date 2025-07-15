export interface EmailConfig {
    smtp: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
            user: string;
            pass: string;
        };
    };
    imap: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
            user: string;
            pass: string;
        };
    };
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
export declare class EmailService {
    private config;
    private logger;
    private smtpTransporter;
    private imapClient;
    constructor(config: EmailConfig);
    initialize(): Promise<void>;
    private connectIMAP;
    sendReportEmail(reportPath: string, reportName: string, platformName: string, extractionMetadata: any): Promise<void>;
    waitForTwoFactorCode(timeoutMs?: number, // 5 minutes default
    fromDomain?: string): Promise<TwoFactorCode>;
    private extract2FACode;
    sendNotificationEmail(subject: string, message: string, isError?: boolean): Promise<void>;
    private formatFileSize;
    private getContentType;
    close(): Promise<void>;
}
//# sourceMappingURL=EmailService.d.ts.map