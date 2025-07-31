import { Browser } from 'playwright';
import { PlatformAdapter, PlatformCredentials, ReportRequest, ExtractionResult, AgentConfig } from '../types';
export declare class VinSolutionsAgent implements PlatformAdapter {
    readonly platformName = "vinsolutions";
    private page;
    private browser;
    private logger;
    private fileManager;
    private config;
    private isAuthenticated;
    constructor(config: AgentConfig);
    initialize(browser: Browser): Promise<void>;
    private setupDownloadHandling;
    login(credentials: PlatformCredentials): Promise<boolean>;
    navigateToReports(): Promise<boolean>;
    private getReportFrame;
    extractReport(request: ReportRequest): Promise<ExtractionResult>;
    private findAndSelectReport;
    private openReport;
    private downloadReport;
    private perceivePage;
    private findElementByDescription;
    private takeErrorScreenshot;
    logout(): Promise<void>;
    isLoggedIn(): Promise<boolean>;
    close(): Promise<void>;
}
//# sourceMappingURL=VinSolutionsAgent.d.ts.map