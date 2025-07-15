export interface AgentConfig {
    vinsolutions: {
        username: string;
        password: string;
        url: string;
    };
    mailgun: {
        apiKey: string;
        domain: string;
        fromEmail: string;
        fromName?: string;
    };
    gmail: {
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
    };
    openrouter: {
        apiKey: string;
        baseURL?: string;
        defaultModel?: string;
    };
    reportRecipients: string[];
    downloadDir: string;
    screenshotDir: string;
}
export interface ExtractionResult {
    success: boolean;
    reportPath?: string;
    reportName: string;
    platformName: string;
    extractedAt: string;
    executionTime: number;
    error?: string;
    screenshots: string[];
}
export declare class CompleteVinSolutionsAgent {
    private config;
    private logger;
    private mailgunService;
    private emailService;
    private openRouterService;
    private browser;
    private page;
    constructor(config: AgentConfig);
    initialize(): Promise<void>;
    extractLeadSourceROI(): Promise<ExtractionResult>;
    private performLogin;
    private handle2FA;
    private navigateToReports;
    private accessFavoritesTab;
    private extractReport;
    private sendSuccessNotification;
    private sendFailureNotification;
    private takeScreenshot;
    private cleanup;
}
//# sourceMappingURL=CompleteVinSolutionsAgent.d.ts.map