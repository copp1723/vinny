interface VinSolutionsConfig {
    credentials: {
        username: string;
        password: string;
    };
    webhook: {
        baseUrl: string;
    };
    notifications: {
        recipients: string[];
    };
    mailgun: {
        apiKey: string;
        domain: string;
        from: string;
    };
    openrouter: {
        apiKey: string;
    };
}
export declare class AutonomousVinSolutionsAgent {
    private browser;
    private page;
    private logger;
    private mailgun;
    private openrouter;
    private config;
    private executionSteps;
    private startTime;
    constructor(config: VinSolutionsConfig);
    private addStep;
    extractReport(reportName: string): Promise<{
        success: boolean;
        filePath?: string;
        error?: string;
    }>;
    private initializeBrowser;
    private loginToVinSolutions;
    private waitForTwoFACode;
    private navigateToReports;
    private downloadReport;
    private sendStartNotification;
    private sendSuccessNotification;
    private sendErrorNotification;
    private cleanup;
}
export {};
//# sourceMappingURL=AutonomousVinSolutionsAgent.d.ts.map