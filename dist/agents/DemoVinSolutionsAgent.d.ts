export interface DemoAgentConfig {
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
    openrouter: {
        apiKey: string;
        baseURL?: string;
        defaultModel?: string;
    };
    reportRecipients: string[];
    downloadDir: string;
    screenshotDir: string;
    webhookUrl?: string;
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
export declare class DemoVinSolutionsAgent {
    private config;
    private logger;
    private mailgunService;
    private openRouterService;
    private browser;
    private page;
    constructor(config: DemoAgentConfig);
    initialize(): Promise<void>;
    extractLeadSourceROI(): Promise<ExtractionResult>;
    private performLogin;
    private handle2FA;
    private getCodeFromWebhook;
    private enterTwoFactorCode;
    private is2FAScreenVisible;
    private isCodeEntryScreenVisible;
    private navigateToReports;
    private extractReport;
    private sendSuccessNotification;
    private sendFailureNotification;
    private takeScreenshot;
    private cleanup;
}
//# sourceMappingURL=DemoVinSolutionsAgent.d.ts.map